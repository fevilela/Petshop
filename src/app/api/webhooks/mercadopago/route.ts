import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consultarPagamento } from "@/lib/mercadopago";

/**
 * Webhook de notificações do Mercado Pago.
 * Configure a URL pública (ex: https://seu-dominio.com/api/webhooks/mercadopago)
 * no painel do Mercado Pago > Suas integrações > Webhooks.
 *
 * Fluxo: MP notifica {type: "payment", data: {id}} -> consultamos o pagamento
 * -> localizamos a Cobranca por external_reference (= Cobranca.id ou mercadoPagoId)
 * -> atualizamos status para PAGO quando aprovado.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paymentId: string | undefined = body?.data?.id ?? body?.id;
    const topic: string | undefined = body?.type ?? body?.topic;

    if (topic !== "payment" || !paymentId) {
      // Outros tipos de evento (ex: merchant_order) são ignorados por ora.
      return NextResponse.json({ ok: true, ignored: true });
    }

    const pagamento = await consultarPagamento(String(paymentId));
    const cobrancaId: string | undefined = pagamento.external_reference;
    if (!cobrancaId) return NextResponse.json({ ok: true, semReferencia: true });

    const cobranca = await prisma.cobranca.findUnique({ where: { id: cobrancaId } });
    if (!cobranca) return NextResponse.json({ ok: true, cobrancaNaoEncontrada: true });

    if (pagamento.status === "approved") {
      await prisma.cobranca.update({
        where: { id: cobrancaId },
        data: {
          status: "PAGO",
          dataPagamento: new Date(),
          mercadoPagoId: String(pagamento.id),
        },
      });
    } else if (["cancelled", "rejected"].includes(pagamento.status)) {
      await prisma.cobranca.update({
        where: { id: cobrancaId },
        data: { status: "CANCELADO" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook Mercado Pago:", err);
    // Retornamos 200 para o MP não ficar re-tentando indefinidamente em erros
    // de dados; erros de infraestrutura devem ser monitorados via log externo.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
