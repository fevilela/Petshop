"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { prisma as sharedPrisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { criarPagamentoPix, criarBoleto, criarLinkPagamentoCartao } from "@/lib/mercadopago";
import { verificarPagamentoCobranca, marcarCobrancaNotificada } from "@/lib/cobranca";
import { criarAssinatura } from "@/lib/assinatura";

const itemSchema = z.object({
  itemCatalogoId: z.string().min(1),
  quantidade: z.number().int().positive(),
});

const vendaSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente"),
  animalId: z.string().optional(),
  // MENSALISTA (a antiga forma "incluso no plano, grátis") não é mais
  // aceita aqui de propósito — a tela não oferece mais essa opção (ver
  // VendaForm.tsx) e o conceito foi removido (ver prisma/schema.prisma). O
  // valor continua existindo no enum do banco só por causa de vendas
  // antigas já gravadas.
  formaPagamento: z.enum([
    "DINHEIRO",
    "PIX_MANUAL",
    "CARTAO_MANUAL",
    "BOLETO",
    "PIX_MERCADOPAGO",
    "CARTAO_LINK",
    "A_FATURAR",
  ]),
  assinaturaId: z.string().optional(),
  observacoes: z.string().optional(),
  itensJson: z.string().min(2, "Adicione ao menos um item"),
});

/** Formas de pagamento que exigem gerar uma Cobrança (boleto/pix/link) via Mercado Pago. */
const FORMAS_COM_COBRANCA = ["BOLETO", "PIX_MERCADOPAGO", "CARTAO_LINK"] as const;

/**
 * A_FATURAR: item extra de um mensalista, não pago na hora — acumula pra
 * fatura mensal (ver src/lib/faturamento.ts). Exige uma assinatura ATIVA já
 * existente do cliente (diferente de vender uma MENSALIDADE no carrinho,
 * que CRIA a assinatura — ver mais abaixo).
 */
const FORMAS_QUE_EXIGEM_ASSINATURA = new Set(["A_FATURAR"]);

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

  const formaCobrancaMensalidadeRaw = formData.get("formaCobrancaMensalidade");
  const formaCobrancaMensalidade =
    formaCobrancaMensalidadeRaw === "BOLETO" ||
    formaCobrancaMensalidadeRaw === "PIX" ||
    formaCobrancaMensalidadeRaw === "CARTAO_LINK"
      ? formaCobrancaMensalidadeRaw
      : undefined;

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

  // Boleto exige CPF/CNPJ na API do Mercado Pago (ver criarBoleto em
  // src/lib/mercadopago.ts) — documento é opcional no cadastro do cliente,
  // então sem essa checagem a venda era criada normalmente e só a cobrança
  // falhava depois, silenciosamente (mensagem genérica na tela, sem deixar
  // claro que o problema era o CPF/CNPJ faltando, não o Mercado Pago).
  // Falhar aqui, antes de criar qualquer coisa, evita a venda "quebrada".
  if (parsed.formaPagamento === "BOLETO" && !cliente.documento) {
    throw new Error(
      `Não é possível gerar boleto: ${cliente.nome} não tem CPF/CNPJ cadastrado. Edite o cliente em /clientes ou escolha outra forma de pagamento.`
    );
  }

  if (parsed.animalId) {
    const animalEncontrado = await prisma.animal.findUnique({ where: { id: parsed.animalId } });
    if (!animalEncontrado) throw new Error("O animal selecionado não foi encontrado.");
  }

  if (FORMAS_QUE_EXIGEM_ASSINATURA.has(parsed.formaPagamento)) {
    await prisma.assinatura.findUniqueOrThrow({ where: { id: parsed.assinaturaId! } });
  }

  // Nunca confiamos no preço vindo do cliente: buscamos o catálogo no banco
  // e recalculamos os valores no servidor (evita manipulação do preço no navegador).
  const itemCatalogoIds = itensInput.map((i) => i.itemCatalogoId);
  const itensCatalogo = await prisma.itemCatalogo.findMany({ where: { id: { in: itemCatalogoIds } } });
  const catalogoMap = new Map(itensCatalogo.map((c) => [c.id, c]));

  const mensalidadesNoCarrinho = itensInput.filter((i) => catalogoMap.get(i.itemCatalogoId)?.tipo === "MENSALIDADE");
  if (mensalidadesNoCarrinho.length > 1) {
    throw new Error("Só é possível assinar uma mensalidade por venda.");
  }

  const itensParaCriar = itensInput.map((item) => {
    const catalogo = catalogoMap.get(item.itemCatalogoId);
    if (!catalogo) throw new Error("Item do catálogo não encontrado.");
    const precoUnitario = Number(catalogo.preco);
    return {
      itemCatalogoId: item.itemCatalogoId,
      tipo: catalogo.tipo,
      animalId: parsed.animalId || undefined,
      quantidade: item.quantidade,
      precoUnitario,
      subtotal: precoUnitario * item.quantidade,
    };
  });

  // Mensalidade não entra no valor cobrado NESTA venda — ela cria a
  // Assinatura, e a primeira cobrança sai na próxima fatura mensal (mesmo
  // fluxo de qualquer outro mês, ver src/lib/faturamento.ts). O item ainda
  // é gravado em ItemVenda (subtotal cheio) só pra aparecer no recibo.
  const valorTotal = itensParaCriar
    .filter((i) => i.tipo !== "MENSALIDADE")
    .reduce((acc, i) => acc + i.subtotal, 0);

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
        itens: {
          create: itensParaCriar.map(({ tipo: _tipo, ...i }) => i),
        },
      },
    });

    for (const item of itensParaCriar) {
      if (item.tipo === "PRODUTO") {
        // updateMany (não update) de propósito: permite combinar id +
        // empresaId no where sem depender do "extended where unique" do
        // Prisma — garante que nunca decrementamos estoque de outra empresa.
        await tx.itemCatalogo.updateMany({
          where: { id: item.itemCatalogoId, empresaId },
          data: { estoque: { decrement: item.quantidade } },
        });
      }
      if (item.tipo === "MENSALIDADE") {
        await criarAssinatura({
          prisma: tx,
          empresaId,
          clienteId: parsed.clienteId,
          itemCatalogoId: item.itemCatalogoId,
          formaCobranca: formaCobrancaMensalidade,
        });
      }
    }

    return v;
  });

  // valorTotal > 0 de propósito: se o carrinho só tinha mensalidade (nada a
  // cobrar nesta venda), não faz sentido gerar boleto/Pix/link de R$ 0 no
  // Mercado Pago — a forma de pagamento escolhida simplesmente não se aplica.
  if (valorTotal > 0 && (FORMAS_COM_COBRANCA as readonly string[]).includes(parsed.formaPagamento)) {
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
      // Descriptografia isolada num try próprio: se falhar (typicamente
      // ENCRYPTION_KEY diferente do usado quando o token foi salvo — ver
      // README), quem olhar o log do servidor precisa saber IMEDIATAMENTE
      // que é isso, e não confundir com uma falha da API do Mercado Pago em
      // si (a mensagem na tela, por design, não distingue os dois pro
      // atendente — só o log do servidor tem esse detalhe).
      let accessToken: string;
      try {
        accessToken = decrypt(empresa.mercadoPagoAccessTokenEnc);
      } catch (decryptErr) {
        console.error(
          `[vendas actions] Falha ao descriptografar o token do Mercado Pago da empresa ${empresaId} — provável ENCRYPTION_KEY diferente do usado quando o token foi salvo (ou dado corrompido). Correção: re-salvar o token em /configuracoes (isso re-criptografa com a chave atual).`,
          decryptErr
        );
        throw decryptErr;
      }

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

/** Marca que o atendente clicou em "Abrir no WhatsApp" pra esta cobrança — ver src/lib/cobranca.ts. */
export async function marcarNotificadoAction(cobrancaId: string) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const cobranca = await prisma.cobranca.findUniqueOrThrow({ where: { id: cobrancaId } });

  await marcarCobrancaNotificada(empresaId, cobrancaId);

  revalidatePath("/vendas");
  if (cobranca.vendaId) revalidatePath(`/vendas/${cobranca.vendaId}`);
}
