import { prisma } from "@/lib/prisma";
import { gerarToken } from "@/lib/crypto";
import { enviarEmail, templateConviteHtml } from "@/lib/resend";

// Provisionamento automático de um banco Supabase por empresa foi adiado
// (ver src/lib/supabase-management.ts, mantido no repo mas sem uso — dá pra
// retomar essa rota mais tarde sem reescrever do zero). Por enquanto todas as
// empresas compartilham o mesmo banco (ver prisma/schema.prisma), então
// "cadastrar um petshop-cliente" é só gravar a Empresa e convidar o admin
// dela — não tem mais nada demorado (criar projeto, esperar ficar pronto,
// rodar migration), então essa função pode ser síncrona e direta, sem o
// truque de "fire-and-forget em background" que a versão anterior usava.

type CadastrarEmpresaInput = {
  nomeEmpresa: string;
  emailResponsavel: string;
  nomeResponsavel: string;
  documento?: string;
};

/** Cadastra um petshop-cliente novo e convida o responsável (EMPRESA_ADMIN) por e-mail. */
export async function criarEmpresaEIniciarProvisionamento(input: CadastrarEmpresaInput) {
  const empresa = await prisma.empresa.create({
    data: {
      nome: input.nomeEmpresa,
      documento: input.documento,
      emailResponsavel: input.emailResponsavel,
      status: "ATIVA",
    },
  });

  const usuario = await prisma.usuario.create({
    data: {
      nome: input.nomeResponsavel,
      email: input.emailResponsavel.toLowerCase().trim(),
      role: "EMPRESA_ADMIN",
      empresaId: empresa.id,
    },
  });

  await criarConviteEEnviarEmail(usuario.id, empresa.id, input.nomeEmpresa, input.emailResponsavel);

  return empresa;
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

  await prisma.conviteUsuario.create({
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
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: params.empresaId } });

  const usuario = await prisma.usuario.create({
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
