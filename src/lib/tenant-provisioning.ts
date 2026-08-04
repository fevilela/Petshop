import { prisma } from "@/lib/prisma";
import { gerarToken, encrypt } from "@/lib/crypto";
import { enviarEmail, templateConviteHtml } from "@/lib/resend";
import { TODOS_MODULOS, type ModuloKey } from "@/lib/modulos";
import type { TipoDocumento } from "@prisma/client";

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
  tipoDocumento?: TipoDocumento;
  documento?: string;
  mercadoPagoAccessToken?: string;
  modulosHabilitados: ModuloKey[];
};

/**
 * Criptografa o token do Mercado Pago pra gravar no cadastro da empresa —
 * sem travar a criação do petshop-cliente se isso falhar (ex: ENCRYPTION_KEY
 * ausente/inválida no servidor). Mesmo princípio já aplicado ao e-mail de
 * convite (ver `criarConviteEEnviarEmail` abaixo): o token do Mercado Pago
 * é um dado OPCIONAL neste formulário — o admin pode colar depois em
 * `/configuracoes` assim que a causa for corrigida — então uma falha aqui
 * não pode derrubar a criação da Empresa/usuário, que já é o que realmente
 * importa nesta tela.
 */
function tentarCriptografarTokenMercadoPago(token: string | undefined): string | undefined {
  if (!token) return undefined;
  try {
    return encrypt(token);
  } catch (err) {
    console.error("[tenant-provisioning] Falha ao criptografar token do Mercado Pago (empresa criada sem ele):", err);
    return undefined;
  }
}

/** Cadastra um petshop-cliente novo e convida o responsável (EMPRESA_ADMIN) por e-mail. */
export async function criarEmpresaEIniciarProvisionamento(input: CadastrarEmpresaInput) {
  const empresa = await prisma.empresa.create({
    data: {
      nome: input.nomeEmpresa,
      tipoDocumento: input.tipoDocumento,
      documento: input.documento,
      emailResponsavel: input.emailResponsavel,
      status: "ATIVA",
      mercadoPagoAccessTokenEnc: tentarCriptografarTokenMercadoPago(input.mercadoPagoAccessToken),
      // Fallback pra TODOS_MODULOS se a lista vier vazia: evita cadastrar um
      // petshop sem querer com tudo desligado por um checkbox desmarcado.
      modulosHabilitados: input.modulosHabilitados.length > 0 ? input.modulosHabilitados : TODOS_MODULOS,
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

/**
 * Gera um novo convite (token de 48h) para um usuário e tenta enviar por
 * e-mail. O convite em si (linha no banco + token) já é o que realmente
 * importa para o usuário conseguir logar depois — uma falha no envio do
 * e-mail (Resend fora do ar, RESEND_API_KEY ausente, domínio não
 * verificado, etc.) NÃO deve derrubar a criação do usuário/empresa que
 * disparou este convite. Por isso o erro é logado, não relançado; o admin
 * pode tentar de novo pelo botão "Reenviar convite" assim que a causa for
 * corrigida.
 */
export async function criarConviteEEnviarEmail(
  usuarioId: string,
  empresaId: string | null,
  nomeEmpresa: string,
  email: string
): Promise<{ emailEnviado: boolean }> {
  const token = gerarToken();
  const expiraEm = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.conviteUsuario.create({
    data: { usuarioId, empresaId: empresaId ?? undefined, token, expiraEm },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const linkConvite = `${appUrl}/convite/${token}`;

  try {
    await enviarEmail({
      to: email,
      subject: "Seu acesso ao Petshop CRM",
      html: templateConviteHtml({ nomeEmpresa, linkConvite }),
    });
    return { emailEnviado: true };
  } catch (err) {
    console.error(`[convite] Falha ao enviar e-mail de convite para ${email}:`, err);
    return { emailEnviado: false };
  }
}

/** Cria um usuário adicional (atendente) para uma empresa já ativa, e o convida. */
export async function criarUsuarioEmpresaEConvidar(params: {
  empresaId: string;
  nome: string;
  email: string;
  role: "EMPRESA_ADMIN" | "EMPRESA_ATENDENTE";
  /** Só tem efeito se role for EMPRESA_ATENDENTE; vazio = sem restrição extra. */
  modulosPermitidos?: ModuloKey[];
}) {
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: params.empresaId } });

  const usuario = await prisma.usuario.create({
    data: {
      nome: params.nome,
      email: params.email.toLowerCase().trim(),
      role: params.role,
      empresaId: params.empresaId,
      modulosPermitidos: params.role === "EMPRESA_ATENDENTE" ? params.modulosPermitidos ?? [] : [],
    },
  });

  await criarConviteEEnviarEmail(usuario.id, params.empresaId, empresa.nome, params.email);

  return usuario;
}
