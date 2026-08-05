import { validarClienteParaBoleto } from "@/lib/cliente-validacoes";

/**
 * Cria uma Assinatura (o que torna um cliente "mensalista") a partir de um
 * item do catálogo tipo MENSALIDADE. Compartilhado entre dois pontos de
 * entrada — vender uma mensalidade no carrinho de Vendas
 * (src/app/(app)/vendas/actions.ts) e o campo "é mensalista?" no cadastro
 * do cliente (src/app/(app)/clientes/actions.ts) — pra não duplicar a
 * validação nos dois lugares.
 *
 * Recebe o client Prisma já escopado (ou uma `tx` de transação interativa)
 * porque os dois chamadores às vezes precisam disso dentro da própria
 * transação da venda/cliente.
 *
 * Regra de negócio: um cliente só pode ter UMA assinatura ativa por vez.
 * Não existia essa trava antes (cada assinatura vivia solta, sem
 * verificação) — adicionada agora porque, com a assinatura virando algo que
 * também se cria "sem querer" ao vender uma mensalidade no carrinho, ficou
 * mais fácil duplicar sem perceber. Pra trocar de plano, é preciso cancelar
 * a atual primeiro (ver cancelarAssinatura em planos/actions.ts).
 */
export async function criarAssinatura(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any;
  empresaId: string;
  clienteId: string;
  itemCatalogoId: string;
  valorMensal?: number;
  diaCobranca?: number;
  /** Forma de cobrança padrão da fatura mensal (ver comentário no schema). Default PIX. */
  formaCobranca?: "BOLETO" | "PIX" | "CARTAO_LINK";
}) {
  const { prisma, empresaId, clienteId, itemCatalogoId } = params;
  const formaCobranca = params.formaCobranca ?? "PIX";

  const itemCatalogo = await prisma.itemCatalogo.findFirstOrThrow({
    where: { id: itemCatalogoId, empresaId },
  });
  if (itemCatalogo.tipo !== "MENSALIDADE") {
    throw new Error(`"${itemCatalogo.nome}" não é uma mensalidade.`);
  }

  // Boleto exige CPF/CNPJ + endereço completo na API do Mercado Pago (mesma
  // regra aplicada a vendas avulsas em vendas/actions.ts) — checar aqui, na
  // criação da assinatura, evita que isso só quebre meses depois, na hora
  // de gerar a fatura (pior ainda se for o cron, sem ninguém olhando pra
  // tratar o erro).
  if (formaCobranca === "BOLETO") {
    const cliente = await prisma.cliente.findFirstOrThrow({ where: { id: clienteId, empresaId } });
    const erro = validarClienteParaBoleto(cliente);
    if (erro) throw new Error(erro);
  }

  const jaAssina = await prisma.assinatura.findFirst({
    where: { clienteId, empresaId, status: "ATIVA" },
    include: { itemCatalogo: true },
  });
  if (jaAssina) {
    throw new Error(
      `Este cliente já é mensalista de "${jaAssina.itemCatalogo.nome}". Cancele a assinatura atual antes de assinar outra.`
    );
  }

  return prisma.assinatura.create({
    data: {
      empresaId,
      clienteId,
      itemCatalogoId,
      valorMensal: params.valorMensal ?? itemCatalogo.preco,
      diaCobranca: params.diaCobranca ?? itemCatalogo.diaCobrancaPadrao ?? 5,
      formaCobranca,
    },
  });
}
