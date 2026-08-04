"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { prisma as sharedPrisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { criarPagamentoPix, criarBoleto, criarLinkPagamentoCartao } from "@/lib/mercadopago";
import { verificarPagamentoCobranca } from "@/lib/cobranca";

const itemSchema = z.object({
  tipo: z.enum(["PRODUTO", "SERVICO"]),
  id: z.string().min(1),
  quantidade: z.number().int().positive(),
  animalId: z.string().optional(),
});

const vendaSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente"),
  animalId: z.string().optional(),
  formaPagamento: z.enum([
    "DINHEIRO",
    "PIX_MANUAL",
    "CARTAO_MANUAL",
    "BOLETO",
    "PIX_MERCADOPAGO",
    "CARTAO_LINK",
    "MENSALISTA",
    "A_FATURAR",
  ]),
  assinaturaId: z.string().optional(),
  observacoes: z.string().optional(),
  itensJson: z.string().min(2, "Adicione ao menos um item"),
});

/** Formas de pagamento que exigem gerar uma Cobrança (boleto/pix/link) via Mercado Pago. */
const FORMAS_COM_COBRANCA = ["BOLETO", "PIX_MERCADOPAGO", "CARTAO_LINK"] as const;

/**
 * MENSALISTA: item incluso no plano, nunca cobrado. A_FATURAR: item extra
 * de um mensalista, não pago na hora — acumula pra fatura mensal (ver
 * src/lib/faturamento.ts). As duas exigem uma assinatura ativa do cliente.
 */
const FORMAS_QUE_EXIGEM_ASSINATURA = new Set(["MENSALISTA", "A_FATURAR"]);

export async function createVenda(formData: FormData) {
  const { prisma, empresaId, usuarioId } = await getSessionTenantPrisma();

  const parsed = vendaSchema.parse({
    clienteId: formData.get("clienteId"),
    animalId: formData.get("animalId") || undefined,
    formaPagamento: formData.get("formaPagamento"),
    assinaturaId: formData.get("assinaturaId") || undefined,
    observacoes: formData.get("observacoes") || undefined,
    itensJson: formData.get("itensJson"),
  });

  const itensInput = z.array(itemSchema).min(1, "Adicione ao menos um item").parse(JSON.parse(parsed.itensJson));

  if (FORMAS_QUE_EXIGEM_ASSINATURA.has(parsed.formaPagamento) && !parsed.assinaturaId) {
    throw new Error("Selecione a assinatura do cliente.");
  }

  // Toda referência a outro registro (cliente, animal, assinatura) é
  // validada contra o client já escopado por empresa antes de gravar: como
  // o banco agora é compartilhado entre empresas, um id que existe mas
  // pertence a OUTRO petshop precisa ser rejeitado aqui — sem essa checagem,
  // seria possível "linkar" numa venda o id de um cliente/animal de outra
  // empresa. `findUniqueOrThrow` com o client escopado já garante isso
  // (lança se o id não pertencer a esta empresa).
  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: parsed.clienteId } });

  const animalIds = Array.from(
    new Set([parsed.animalId, ...itensInput.map((i) => i.animalId)].filter((v): v is string => !!v))
  );
  if (animalIds.length > 0) {
    const animaisEncontrados = await prisma.animal.findMany({ where: { id: { in: animalIds } } });
    if (animaisEncontrados.length !== animalIds.length) {
      throw new Error("Um dos animais selecionados não foi encontrado.");
    }
  }

  if (FORMAS_QUE_EXIGEM_ASSINATURA.has(parsed.formaPagamento)) {
    await prisma.assinatura.findUniqueOrThrow({ where: { id: parsed.assinaturaId! } });
  }

  // Nunca confiamos no preço vindo do cliente: buscamos produtos/serviços no banco
  // e recalculamos os valores no servidor (evita manipulação do preço no navegador).
  const produtoIds = itensInput.filter((i) => i.tipo === "PRODUTO").map((i) => i.id);
  const servicoIds = itensInput.filter((i) => i.tipo === "SERVICO").map((i) => i.id);

  const [produtos, servicos] = await Promise.all([
    prisma.produto.findMany({ where: { id: { in: produtoIds } } }),
    prisma.servico.findMany({ where: { id: { in: servicoIds } } }),
  ]);
  const produtoMap = new Map(produtos.map((p) => [p.id, p]));
  const servicoMap = new Map(servicos.map((s) => [s.id, s]));

  const itensParaCriar = itensInput.map((item) => {
    const catalogo = item.tipo === "PRODUTO" ? produtoMap.get(item.id) : servicoMap.get(item.id);
    if (!catalogo) throw new Error("Item do catálogo não encontrado.");
    const precoUnitario = Number(catalogo.preco);
    return {
      tipo: item.tipo,
      produtoId: item.tipo === "PRODUTO" ? item.id : undefined,
      servicoId: item.tipo === "SERVICO" ? item.id : undefined,
      animalId: item.animalId || parsed.animalId || undefined,
      quantidade: item.quantidade,
      precoUnitario,
      subtotal: precoUnitario * item.quantidade,
    };
  });

  const valorTotal = itensParaCriar.reduce((acc, i) => acc + i.subtotal, 0);

  // empresaId é passado explicitamente aqui (mesmo o client `prisma` já
  // sendo escopado por tenant) porque `$transaction(async (tx) => ...)` usa
  // um client de transação interativa — não confiamos cegamente que o
  // Client Extension de tenant-scoping se propaga para dentro de `tx` sem
  // testar isso ao vivo (não dá pra rodar Prisma neste ambiente). É reforço
  // redundante e barato para o caminho de código que mexe em dinheiro.
  const venda = await prisma.$transaction(async (tx) => {
    const v = await tx.venda.create({
      data: {
        empresaId,
        clienteId: parsed.clienteId,
        animalId: parsed.animalId || undefined,
        assinaturaId: FORMAS_QUE_EXIGEM_ASSINATURA.has(parsed.formaPagamento) ? parsed.assinaturaId : undefined,
        formaPagamento: parsed.formaPagamento,
        valorTotal,
        observacoes: parsed.observacoes,
        criadoPorId: usuarioId,
        itens: { create: itensParaCriar },
      },
    });

    for (const item of itensParaCriar) {
      if (item.produtoId) {
        // updateMany (não update) de propósito: permite combinar id +
        // empresaId no where sem depender do "extended where unique" do
        // Prisma — garante que nunca decrementamos estoque de outra empresa.
        await tx.produto.updateMany({
          where: { id: item.produtoId, empresaId },
          data: { estoque: { decrement: item.quantidade } },
        });
      }
    }

    return v;
  });

  if ((FORMAS_COM_COBRANCA as readonly string[]).includes(parsed.formaPagamento)) {
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 3);

    const cobranca = await prisma.cobranca.create({
      data: {
        empresaId,
        tipo:
          parsed.formaPagamento === "BOLETO"
            ? "BOLETO"
            : parsed.formaPagamento === "PIX_MERCADOPAGO"
            ? "PIX"
            : "CARTAO_LINK",
        valor: valorTotal,
        vendaId: venda.id,
        dataVencimento,
      },
    });

    try {
      const empresa = await sharedPrisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
      if (!empresa.mercadoPagoAccessTokenEnc) {
        throw new Error(
          "Mercado Pago não configurado para esta empresa. Configure o token em /configuracoes."
        );
      }
      const accessToken = decrypt(empresa.mercadoPagoAccessTokenEnc);

      const input = {
        cobrancaId: cobranca.id,
        empresaId,
        valor: valorTotal,
        descricao: `Venda #${venda.numero} - ${cliente.nome}`,
        clienteNome: cliente.nome,
        clienteEmail: cliente.email ?? undefined,
        clienteDocumento: cliente.documento ?? undefined,
        dataVencimento,
      };

      if (parsed.formaPagamento === "PIX_MERCADOPAGO") {
        const pix = await criarPagamentoPix(accessToken, input);
        await prisma.cobranca.update({
          where: { id: cobranca.id },
          data: { mercadoPagoId: pix.mercadoPagoId, qrCode: pix.qrCode, qrCodeBase64: pix.qrCodeBase64 },
        });
      } else if (parsed.formaPagamento === "BOLETO") {
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
      console.error("Falha ao gerar cobrança no Mercado Pago (venda criada normalmente):", err);
    }
  }

  revalidatePath("/vendas");
  redirect("/vendas");
}

/**
 * Marca uma cobrança como paga manualmente (uso do atendente quando o
 * webhook do Mercado Pago ainda não está configurado, ou pagamento em dinheiro
 * fora do fluxo automático).
 */
export async function marcarCobrancaPaga(cobrancaId: string) {
  const { prisma } = await getSessionTenantPrisma();
  const cobranca = await prisma.cobranca.update({
    where: { id: cobrancaId },
    data: { status: "PAGO", dataPagamento: new Date() },
  });
  revalidatePath("/vendas");
  if (cobranca.vendaId) revalidatePath(`/vendas/${cobranca.vendaId}`);
}

/**
 * Reconsulta o pagamento direto na API do Mercado Pago e atualiza a Cobrança
 * se já tiver sido aprovada. Complementa o webhook (`/api/webhooks/mercadopago/
 * [empresaId]`) para os casos em que ele ainda não disparou — ou nem foi
 * configurado, já que cada petshop-cliente tem sua própria conta e pode não
 * ter mexido nisso ainda: dá pro atendente clicar "Verificar pagamento" e
 * confirmar na hora, sem depender só da notificação automática.
 */
export async function verificarPagamentoAction(cobrancaId: string) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const cobranca = await prisma.cobranca.findUniqueOrThrow({ where: { id: cobrancaId } });

  await verificarPagamentoCobranca(empresaId, cobrancaId);

  revalidatePath("/vendas");
  if (cobranca.vendaId) revalidatePath(`/vendas/${cobranca.vendaId}`);
}
