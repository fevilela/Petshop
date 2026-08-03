import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { controlPrisma } from "@/lib/control-prisma";
import { encrypt, gerarSenhaForte, gerarToken } from "@/lib/crypto";
import {
  criarProjetoSupabase,
  aguardarProjetoPronto,
  montarConnectionStrings,
} from "@/lib/supabase-management";
import { enviarEmail, templateConviteHtml } from "@/lib/resend";

const execFileAsync = promisify(execFile);

/**
 * Roda `prisma migrate deploy` do schema de tenant contra uma connection
 * string qualquer, passada em runtime — é assim que aplicamos as tabelas
 * no banco novo de cada empresa, sem precisar de acesso ao endpoint de
 * migrations da Management API da Supabase (que é liberado só para clientes
 * selecionados, conforme a documentação deles).
 *
 * Só funciona porque o Render roda um processo Node persistente (não
 * serverless) com o código-fonte e o pacote `prisma` disponíveis no
 * filesystem — por isso `prisma` precisa estar em "dependencies", não em
 * "devDependencies" (senão some no build de produção).
 */
async function rodarMigrationsNoTenant(databaseUrl: string): Promise<void> {
  const schemaPath = path.join(process.cwd(), "prisma", "tenant", "schema.prisma");

  await execFileAsync("npx", ["prisma", "migrate", "deploy", `--schema=${schemaPath}`], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    timeout: 2 * 60 * 1000,
  });
}

type CadastrarEmpresaInput = {
  nomeEmpresa: string;
  emailResponsavel: string;
  nomeResponsavel: string;
  documento?: string;
};

/**
 * Fluxo completo de "cadastrar petshop-cliente novo", em duas partes:
 *
 *  - `criarEmpresaEIniciarProvisionamento` é RÁPIDA (só grava a Empresa com
 *    status PROVISIONANDO) e retorna na hora — é o que a Server Action chama
 *    e aguarda antes de redirecionar a tela.
 *  - `provisionarEmpresaEmBackground` faz o trabalho demorado (criar projeto
 *    Supabase, esperar ficar pronto, rodar migrations, mandar e-mail — tudo
 *    isso pode levar de 1 a 4 minutos) e é chamada SEM await pela action,
 *    rodando em segundo plano no mesmo processo Node do Render (que é
 *    persistente, diferente de uma function serverless que morreria assim
 *    que a resposta HTTP fosse enviada).
 *
 * A tela de /admin/empresas mostra o status (PROVISIONANDO/ATIVA/ERRO) e
 * pode ser recarregada manualmente até o provisionamento terminar.
 */
export async function criarEmpresaEIniciarProvisionamento(input: CadastrarEmpresaInput) {
  const empresa = await controlPrisma.empresa.create({
    data: {
      nome: input.nomeEmpresa,
      documento: input.documento,
      emailResponsavel: input.emailResponsavel,
      status: "PROVISIONANDO",
    },
  });

  // Fire-and-forget: não usamos `await` aqui de propósito. O `.catch` extra
  // é só uma rede de segurança para nunca deixar uma promise rejeitada sem
  // handler (o que derrubaria o processo Node em versões mais novas).
  provisionarEmpresaEmBackground(empresa.id, input).catch((err) => {
    console.error(`Provisionamento da empresa ${empresa.id} falhou de forma inesperada:`, err);
  });

  return empresa;
}

async function provisionarEmpresaEmBackground(empresaId: string, input: CadastrarEmpresaInput) {
  try {
    const dbPass = gerarSenhaForte();
    const projeto = await criarProjetoSupabase(input.nomeEmpresa, dbPass);

    await controlPrisma.empresa.update({
      where: { id: empresaId },
      data: { supabaseProjectRef: projeto.id, supabaseProjectRegion: projeto.region },
    });

    await aguardarProjetoPronto(projeto.id);

    const { direta, pooler } = montarConnectionStrings(projeto.id, projeto.region, dbPass);

    // Migrations rodam pelo pooler (o direto é IPv6-only e o Render não
    // alcança) — ver decisão registrada no README sobre o mesmo problema
    // que já resolvemos na Fase 1.
    await rodarMigrationsNoTenant(pooler);

    await controlPrisma.empresa.update({
      where: { id: empresaId },
      data: {
        status: "ATIVA",
        databaseUrlEnc: encrypt(pooler),
        databaseUrlDiretaEnc: encrypt(direta),
        provisionamentoErro: null,
      },
    });

    const usuario = await controlPrisma.usuario.create({
      data: {
        nome: input.nomeResponsavel,
        email: input.emailResponsavel.toLowerCase().trim(),
        role: "EMPRESA_ADMIN",
        empresaId,
      },
    });

    await criarConviteEEnviarEmail(usuario.id, empresaId, input.nomeEmpresa, input.emailResponsavel);
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    await controlPrisma.empresa.update({
      where: { id: empresaId },
      data: { status: "ERRO_PROVISIONAMENTO", provisionamentoErro: mensagem },
    });
  }
}

/** Gera um novo convite (token de 48h) para um usuário e envia por e-mail. */
export async function criarConviteEEnviarEmail(
  usuarioId: string,
  empresaId: string | null,
  nomeEmpresa: string,
  email: string
) {
  const token = gerarToken();
  const expiraEm = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await controlPrisma.conviteUsuario.create({
    data: { usuarioId, empresaId: empresaId ?? undefined, token, expiraEm },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const linkConvite = `${appUrl}/convite/${token}`;

  await enviarEmail({
    to: email,
    subject: "Seu acesso ao Petshop CRM",
    html: templateConviteHtml({ nomeEmpresa, linkConvite }),
  });
}

/** Cria um usuário adicional (atendente) para uma empresa já ativa, e o convida. */
export async function criarUsuarioEmpresaEConvidar(params: {
  empresaId: string;
  nome: string;
  email: string;
  role: "EMPRESA_ADMIN" | "EMPRESA_ATENDENTE";
}) {
  const empresa = await controlPrisma.empresa.findUniqueOrThrow({ where: { id: params.empresaId } });

  const usuario = await controlPrisma.usuario.create({
    data: {
      nome: params.nome,
      email: params.email.toLowerCase().trim(),
      role: params.role,
      empresaId: params.empresaId,
    },
  });

  await criarConviteEEnviarEmail(usuario.id, params.empresaId, empresa.nome, params.email);

  return usuario;
}
