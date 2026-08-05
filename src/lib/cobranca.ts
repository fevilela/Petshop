import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { consultarPagamento, cancelarPagamento } from "@/lib/mercadopago";

/**
 * Reconsulta uma Cobranca (de venda avulsa OU de fatura mensal consolidada
 * — as duas são o mesmo model, só mudando vendaId vs. assinaturaId) direto
 * na API do Mercado Pago e atualiza o status se necessário.
 *
 * Lógica pura, sem `revalidatePath`: cada Server Action que chama isso é
 * responsável por revalidar as rotas certas pro contexto dela (tela de
 * venda em vendas/actions.ts, tela de fatura em
 * planos/faturamento/actions.ts) — evita duplicar a parte que fala com o
 * Mercado Pago em dois lugares.
 */
export async function verificarPagamentoCobranca(empresaId: string, cobrancaId: string): Promise<void> {
  const cobranca = await prisma.cobranca.findFirstOrThrow({ where: { id: cobrancaId, empresaId } });
  if (cobranca.status !== "PENDENTE" || !cobranca.mercadoPagoId) return;

  try {
    const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
    if (!empresa.mercadoPagoAccessTokenEnc) {
      throw new Error("Mercado Pago não configurado para esta empresa.");
    }
    const accessToken = decrypt(empresa.mercadoPagoAccessTokenEnc);
    const pagamento = await consultarPagamento(accessToken, cobranca.mercadoPagoId);

    if (pagamento.status === "approved") {
      await prisma.cobranca.update({
        where: { id: cobrancaId },
        data: {
          status: "PAGO",
          dataPagamento: pagamento.date_approved ? new Date(pagamento.date_approved) : new Date(),
        },
      });
    } else if (pagamento.status === "cancelled" || pagamento.status === "rejected") {
      await prisma.cobranca.update({ where: { id: cobrancaId }, data: { status: "CANCELADO" } });
    }
    // Se ainda estiver "pending"/"in_process" no Mercado Pago, não fazemos
    // nada — a cobrança continua PENDENTE, o que já é o estado correto.
  } catch (err) {
    // Não relançamos: uma falha na checagem manual não deve quebrar a tela
    // pro atendente, só não atualiza nada desta vez.
    console.error(`[cobranca] Falha ao verificar pagamento manualmente (cobranca ${cobrancaId}):`, err);
  }
}

/**
 * Cancela uma Cobrança ainda PENDENTE (Pix, boleto ou link de pagamento) —
 * uso do atendente quando a venda foi um engano, o cliente desistiu, ou a
 * cobrança foi gerada errada. Escopo deliberadamente limitado a PENDENTE:
 * cancelar uma cobrança já PAGA seria um estorno (mexe em dinheiro de
 * verdade, pode ter taxa do Mercado Pago) — isso é uma feature separada,
 * ainda não construída, tratada com mais cautela.
 *
 * Retorna `{ ok: false, motivo }` em vez de lançar em casos esperados
 * (cobrança não está mais pendente, ou o Mercado Pago recusou o cancelamento
 * porque o cliente acabou de pagar) — quem chama decide se propaga como erro
 * pra tela. Diferente de `verificarPagamentoCobranca`, que engole erros
 * silenciosamente por ser uma checagem em segundo plano: aqui o atendente
 * clicou num botão esperando uma confirmação, então uma falha precisa
 * aparecer pra ele.
 */
export async function cancelarCobranca(empresaId: string, cobrancaId: string): Promise<{ ok: boolean; motivo?: string }> {
  const cobranca = await prisma.cobranca.findFirstOrThrow({ where: { id: cobrancaId, empresaId } });

  if (cobranca.status !== "PENDENTE") {
    return { ok: false, motivo: "Só é possível cancelar uma cobrança pendente." };
  }

  // PIX/BOLETO: mercadoPagoId é o id de um pagamento de verdade na Payments
  // API, cancelável enquanto pendente. CARTAO_LINK: mercadoPagoId é o id de
  // uma *preferência* de checkout — não existe pagamento pra cancelar até
  // alguém efetivamente pagar por aquele link, então só marcamos cancelado
  // localmente (o link continua existindo no Mercado Pago, mas paramos de
  // divulgar/acompanhar ele por aqui).
  if (cobranca.mercadoPagoId && cobranca.tipo !== "CARTAO_LINK") {
    try {
      const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId } });
      if (empresa.mercadoPagoAccessTokenEnc) {
        const accessToken = decrypt(empresa.mercadoPagoAccessTokenEnc);
        await cancelarPagamento(accessToken, cobranca.mercadoPagoId);
      }
    } catch (err) {
      // Não marcamos como cancelado aqui: se o Mercado Pago recusou (ex.: o
      // cliente pagou nos últimos segundos, antes do clique do atendente),
      // seria esconder um pagamento que pode ter ido de verdade. Melhor
      // avisar e deixar o atendente conferir com "Verificar pagamento agora"
      // antes de tentar cancelar de novo.
      console.error(`[cobranca] Falha ao cancelar pagamento no Mercado Pago (cobranca ${cobrancaId}):`, err);
      return {
        ok: false,
        motivo:
          'Não foi possível cancelar no Mercado Pago (o cliente pode ter pago agora há pouco). Clique em "Verificar pagamento agora" antes de tentar cancelar de novo.',
      };
    }
  }

  await prisma.cobranca.update({ where: { id: cobrancaId }, data: { status: "CANCELADO" } });
  return { ok: true };
}

/**
 * Marca que o atendente clicou em "Abrir no WhatsApp" pra esta cobrança —
 * usado só pra alimentar o lembrete de faturas geradas automaticamente pelo
 * cron que ainda não foram enviadas (painel + lista de faturamento mensal).
 * NÃO é confirmação de entrega/leitura: não temos como saber se a mensagem
 * foi realmente enviada ou lida (o WhatsApp abre numa aba separada, fora do
 * nosso controle) — é só "alguém clicou aqui", suficiente pra tirar o
 * lembrete de vista sem reintroduzir uma integração.
 */
export async function marcarCobrancaNotificada(empresaId: string, cobrancaId: string): Promise<void> {
  await prisma.cobranca.updateMany({
    where: { id: cobrancaId, empresaId },
    data: { notificadoClienteEm: new Date() },
  });
}
