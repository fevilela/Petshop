import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { consultarPagamento } from "@/lib/mercadopago";

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
