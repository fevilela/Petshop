"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { criarPagamentoPix, criarBoleto, criarLinkPagamentoCartao } from "@/lib/mercadopago";
import { sendTemplateMessage } from "@/lib/whatsapp";
import { normalizePhoneE164 } from "@/lib/utils";

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
  ]),
  assinaturaId: z.string().optional(),
  observacoes: z.string().optional(),
  itensJson: z.string().min(2, "Adicione ao menos um item"),
});

/** Formas de pagamento que exigem gerar uma Cobrança (boleto/pix/link) via Mercado Pago. */
const FORMAS_COM_COBRANCA = ["BOLETO", "PIX_MERCADOPAGO", "CARTAO_LINK"] as const;

export async function createVenda(formData: FormData) {
  const session = await getServerSession(authOptions);

  const parsed = vendaSchema.parse({
    clienteId: formData.get("clienteId"),
    animalId: formData.get("animalId") || undefined,
    formaPagamento: formData.get("formaPagamento"),
    assinaturaId: formData.get("assinaturaId") || undefined,
    observacoes: formData.get("observacoes") || undefined,
    itensJson: formData.get("itensJson"),
  });

  const itensInput = z.array(itemSchema).min(1, "Adicione ao menos um item").parse(JSON.parse(parsed.itensJson));

  if (parsed.formaPagamento === "MENSALISTA" && !parsed.assinaturaId) {
    throw new Error("Selecione a assinatura do cliente para debitar da mensalidade.");
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

  const venda = await prisma.$transaction(async (tx) => {
    const v = await tx.venda.create({
      data: {
        clienteId: parsed.clienteId,
        animalId: parsed.animalId || undefined,
        assinaturaId: parsed.formaPagamento === "MENSALISTA" ? parsed.assinaturaId : undefined,
        formaPagamento: parsed.formaPagamento,
        valorTotal,
        observacoes: parsed.observacoes,
        criadoPorId: session?.user.id,
        itens: { create: itensParaCriar },
      },
    });

    for (const item of itensParaCriar) {
      if (item.produtoId) {
        await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoque: { decrement: item.quantidade } },
        });
      }
    }

    return v;
  });

  if ((FORMAS_COM_COBRANCA as readonly string[]).includes(parsed.formaPagamento)) {
    const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: parsed.clienteId } });
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + 3);

    const cobranca = await prisma.cobranca.create({
      data: {
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
      const input = {
        cobrancaId: cobranca.id,
        valor: valorTotal,
        descricao: `Venda #${venda.numero} - ${cliente.nome}`,
        clienteNome: cliente.nome,
        clienteEmail: cliente.email ?? undefined,
        clienteDocumento: cliente.documento ?? undefined,
        dataVencimento,
      };

      if (parsed.formaPagamento === "PIX_MERCADOPAGO") {
        const pix = await criarPagamentoPix(input);
        await prisma.cobranca.update({
          where: { id: cobranca.id },
          data: { mercadoPagoId: pix.mercadoPagoId, qrCode: pix.qrCode, qrCodeBase64: pix.qrCodeBase64 },
        });
      } else if (parsed.formaPagamento === "BOLETO") {
        const boleto = await criarBoleto(input);
        await prisma.cobranca.update({
          where: { id: cobranca.id },
          data: { mercadoPagoId: boleto.mercadoPagoId, linkPagamento: boleto.linkPagamento, linhaDigitavel: boleto.linhaDigitavel },
        });
      } else {
        const link = await criarLinkPagamentoCartao(input);
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
  await prisma.cobranca.update({
    where: { id: cobrancaId },
    data: { status: "PAGO", dataPagamento: new Date() },
  });
  revalidatePath("/vendas");
}

/**
 * Envia a cobrança (boleto/pix/link) para o WhatsApp do cliente via template
 * aprovado. Requer WHATSAPP_ACCESS_TOKEN configurado e um template chamado
 * "cobranca_disponivel" aprovado no WhatsApp Manager (ver README).
 */
export async function enviarCobrancaWhatsapp(cobrancaId: string) {
  const cobranca = await prisma.cobranca.findUniqueOrThrow({
    where: { id: cobrancaId },
    include: { venda: { include: { cliente: true } } },
  });

  const cliente = cobranca.venda?.cliente;
  if (!cliente) throw new Error("Cobrança sem cliente associado.");

  const telefone = normalizePhoneE164(cliente.telefone);
  const linkOuInfo = cobranca.linkPagamento || cobranca.qrCode || "gerar manualmente";

  try {
    const resultado = await sendTemplateMessage(telefone, "cobranca_disponivel", "pt_BR", [
      cliente.nome,
      String(cobranca.valor),
      cobranca.tipo,
      linkOuInfo,
    ]);

    await prisma.$transaction([
      prisma.whatsappMensagem.create({
        data: {
          clienteId: cliente.id,
          cobrancaId: cobranca.id,
          telefone,
          tipo: "cobranca",
          status: "ENVIADO",
          mensagemId: resultado?.messages?.[0]?.id,
        },
      }),
      prisma.cobranca.update({ where: { id: cobranca.id }, data: { enviadoWhatsappEm: new Date() } }),
    ]);
  } catch (err) {
    await prisma.whatsappMensagem.create({
      data: {
        clienteId: cliente.id,
        cobrancaId: cobranca.id,
        telefone,
        tipo: "cobranca",
        status: "FALHA",
        erro: err instanceof Error ? err.message : String(err),
      },
    });
    // Não relançamos o erro: uma falha de envio não deve quebrar a tela de
    // vendas para o atendente. O log em WhatsappMensagem permite reenviar depois.
    console.error("Falha ao enviar cobrança por WhatsApp:", err);
  }

  revalidatePath("/vendas");
}
