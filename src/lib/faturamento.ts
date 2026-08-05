import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { criarPagamentoPix, criarBoleto, criarLinkPagamentoCartao } from "@/lib/mercadopago";

/**
 * Fatura mensal de um mensalista: mensalidade da Assinatura + soma das
 * vendas avulsas dele lançadas como "A_FATURAR" (compradas no mês, mas não
 * pagas na hora). Reaproveita o model `Cobranca` — uma fatura é só uma
 * Cobranca com `assinaturaId` setado e `vendaId` nulo (o schema já previa
 * isso desde o início, só nunca tinha sido usado).
 *
 * Este arquivo usa sempre o Prisma Client compartilhado (não o escopado por
 * sessão/tenant), com `empresaId` passado explicitamente em toda query,
 * porque também é chamado a partir do endpoint de cron
 * (src/app/api/cron/gerar-faturas-mensais), que não tem sessão de usuário
 * nenhuma — só o client escopado por sessão (getSessionTenantPrisma)
 * depende de estar logado.
 */

export function referenciaMesAtual(data: Date = new Date()): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export type PreviaFatura = {
  assinaturaId: string;
  clienteId: string;
  clienteNome: string;
  clienteEmail: string | null;
  clienteDocumento: string | null;
  clienteTelefone: string;
  nomeMensalidade: string;
  valorMensalidade: number;
  /** Forma de cobrança padrão da assinatura — pré-seleciona o campo na tela de gerar fatura (pode ser trocada só pra esse mês). */
  formaCobranca: "BOLETO" | "PIX" | "CARTAO_LINK";
  vendasAvulsas: { id: string; numero: number; valorTotal: number; createdAt: Date }[];
  valorAvulsos: number;
  valorTotal: number;
  jaGerada: boolean;
  cobrancaId: string | null;
  /** Só relevante quando `jaGerada` — se o atendente já clicou em "Abrir no WhatsApp" pra essa fatura. */
  notificado: boolean;
};

/**
 * Calcula (sem gravar nada) o que a fatura desta assinatura, neste mês,
 * teria — usado tanto pra mostrar a prévia na tela de Faturamento quanto
 * internamente, antes de gerar de verdade.
 */
export async function calcularPreviaFatura(
  empresaId: string,
  assinaturaId: string,
  referenciaMes: string
): Promise<PreviaFatura> {
  const assinatura = await prisma.assinatura.findFirstOrThrow({
    where: { id: assinaturaId, empresaId },
    include: { cliente: true, itemCatalogo: true },
  });

  const [vendasAvulsas, cobrancaExistente] = await Promise.all([
    prisma.venda.findMany({
      where: { empresaId, assinaturaId, formaPagamento: "A_FATURAR", faturaCobrancaId: null },
      orderBy: { createdAt: "asc" },
    }),
    prisma.cobranca.findUnique({
      where: { assinaturaId_referenciaMes: { assinaturaId, referenciaMes } },
    }),
  ]);

  const valorMensalidade = Number(assinatura.valorMensal);
  const valorAvulsos = vendasAvulsas.reduce((acc, v) => acc + Number(v.valorTotal), 0);

  return {
    assinaturaId,
    clienteId: assinatura.clienteId,
    clienteNome: assinatura.cliente.nome,
    clienteEmail: assinatura.cliente.email,
    clienteDocumento: assinatura.cliente.documento,
    clienteTelefone: assinatura.cliente.telefone,
    nomeMensalidade: assinatura.itemCatalogo.nome,
    valorMensalidade,
    formaCobranca: assinatura.formaCobranca,
    vendasAvulsas: vendasAvulsas.map((v) => ({
      id: v.id,
      numero: v.numero,
      valorTotal: Number(v.valorTotal),
      createdAt: v.createdAt,
    })),
    valorAvulsos,
    valorTotal: valorMensalidade + valorAvulsos,
    jaGerada: !!cobrancaExistente,
    cobrancaId: cobrancaExistente?.id ?? null,
    notificado: !!cobrancaExistente?.notificadoClienteEm,
  };
}

type ResultadoGeracao =
  | { ok: true; cobrancaId: string }
  | { ok: false; motivo: string; cobrancaId?: string };

/**
 * Gera de verdade a fatura mensal: cria a Cobranca consolidada, marca as
 * vendas avulsas incluídas como já faturadas (`faturaCobrancaId`), e tenta
 * gerar o Pix/boleto/link via Mercado Pago (best-effort — se falhar, a
 * fatura já existe e pode ser cobrada/marcada como paga manualmente depois,
 * igual a uma venda avulsa qualquer quando o Mercado Pago não está
 * configurado).
 *
 * `formaCobrancaOverride`: por padrão usa `assinatura.formaCobranca` (o que
 * o cron sempre faz, já que roda sem ninguém pra escolher nada). A tela de
 * Faturamento mensal permite trocar pontualmente só pra esta fatura — isso
 * NÃO altera a preferência salva na assinatura, vale só pra este mês.
 */
export async function gerarFaturaMensal(
  empresaId: string,
  assinaturaId: string,
  referenciaMes: string = referenciaMesAtual(),
  formaCobrancaOverride?: "BOLETO" | "PIX" | "CARTAO_LINK"
): Promise<ResultadoGeracao> {
  const assinatura = await prisma.assinatura.findFirstOrThrow({
    where: { id: assinaturaId, empresaId },
  });
  if (assinatura.status !== "ATIVA") {
    return { ok: false, motivo: "Assinatura não está ativa." };
  }

  const previa = await calcularPreviaFatura(empresaId, assinaturaId, referenciaMes);
  if (previa.jaGerada) {
    return { ok: false, motivo: "Já existe fatura gerada para este mês.", cobrancaId: previa.cobrancaId ?? undefined };
  }

  const formaCobranca = formaCobrancaOverride ?? assinatura.formaCobranca;

  // Mesma regra aplicada na criação da assinatura (src/lib/assinatura.ts) e
  // em vendas avulsas — repetida aqui porque o override pontual pode pedir
  // Boleto mesmo numa assinatura cuja preferência salva é Pix (documento
  // pode ter sido cadastrado depois, ou nunca).
  if (formaCobranca === "BOLETO" && !previa.clienteDocumento) {
    return {
      ok: false,
      motivo: `Não é possível cobrar por boleto: ${previa.clienteNome} não tem CPF/CNPJ cadastrado. Edite o cliente ou escolha Pix/Link de pagamento.`,
    };
  }

  const dataVencimento = new Date();
  dataVencimento.setDate(dataVencimento.getDate() + 3);

  const cobranca = await prisma.$transaction(async (tx) => {
    const c = await tx.cobranca.create({
      data: {
        empresaId,
        tipo: formaCobranca,
        valor: previa.valorTotal,
        assinaturaId,
        referenciaMes,
        dataVencimento,
      },
    });

    if (previa.vendasAvulsas.length > 0) {
      // updateMany (não update) de propósito, e com empresaId no where: mesmo
      // reforço usado em vendas/actions.ts pra nunca escrever fora do escopo
      // da empresa certa mesmo com o banco compartilhado entre tenants.
      await tx.venda.updateMany({
        where: { id: { in: previa.vendasAvulsas.map((v) => v.id) }, empresaId },
        data: { faturaCobrancaId: c.id },
      });
    }

    return c;
  });

  try {
    const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
    if (!empresa.mercadoPagoAccessTokenEnc) {
      throw new Error("Mercado Pago não configurado para esta empresa.");
    }
    // Ver comentário equivalente em vendas/actions.ts: descriptografia
    // isolada num try próprio pra diferenciar no log "ENCRYPTION_KEY errado"
    // de "API do Mercado Pago falhou" — importante aqui especialmente
    // porque o cron roda sem ninguém olhando na hora.
    let accessToken: string;
    try {
      accessToken = decrypt(empresa.mercadoPagoAccessTokenEnc);
    } catch (decryptErr) {
      console.error(
        `[faturamento] Falha ao descriptografar o token do Mercado Pago da empresa ${empresaId} — provável ENCRYPTION_KEY diferente do usado quando o token foi salvo (ou dado corrompido). Correção: re-salvar o token em /configuracoes (isso re-criptografa com a chave atual).`,
        decryptErr
      );
      throw decryptErr;
    }
    const input = {
      cobrancaId: cobranca.id,
      empresaId,
      valor: previa.valorTotal,
      descricao: `Fatura ${referenciaMes} — ${previa.nomeMensalidade} (${previa.clienteNome})`,
      clienteNome: previa.clienteNome,
      clienteEmail: previa.clienteEmail ?? undefined,
      clienteDocumento: previa.clienteDocumento ?? undefined,
      dataVencimento,
    };

    if (formaCobranca === "PIX") {
      const pix = await criarPagamentoPix(accessToken, input);
      await prisma.cobranca.update({
        where: { id: cobranca.id },
        data: { mercadoPagoId: pix.mercadoPagoId, qrCode: pix.qrCode, qrCodeBase64: pix.qrCodeBase64 },
      });
    } else if (formaCobranca === "BOLETO") {
      const boleto = await criarBoleto(accessToken, input);
      await prisma.cobranca.update({
        where: { id: cobranca.id },
        data: { mercadoPagoId: boleto.mercadoPagoId, linkPagamento: boleto.linkPagamento, linhaDigitavel: boleto.linhaDigitavel },
      });
    } else {
      const link = await criarLinkPagamentoCartao(accessToken, input);
      await prisma.cobranca.update({
        where: { id: cobranca.id },
        data: { mercadoPagoId: link.mercadoPagoId, linkPagamento: link.linkPagamento },
      });
    }
  } catch (err) {
    console.error(`[faturamento] Falha ao gerar cobrança da fatura ${cobranca.id} (empresa ${empresaId}):`, err);
  }

  return { ok: true, cobrancaId: cobranca.id };
}
