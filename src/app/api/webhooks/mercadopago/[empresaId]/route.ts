import { NextRequest, NextResponse } from "next/server";
import { controlPrisma } from "@/lib/control-prisma";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { decrypt } from "@/lib/crypto";
import { consultarPagamento } from "@/lib/mercadopago";

/**
 * Webhook de notificações do Mercado Pago — UM POR EMPRESA (multi-tenant).
 *
 * Cada petshop-cliente usa a própria conta Mercado Pago, então cada um
 * precisa configurar a própria URL de webhook apontando para
 *   https://SEU-DOMINIO/api/webhooks/mercadopago/<empresaId>
 * (o empresaId de cada petshop aparece na tela de Configurações).
 *
 * Fluxo: MP notifica {type: "payment", data: {id}} -> buscamos a Empresa
 * pelo empresaId da URL -> descriptografamos o token dela -> consultamos o
 * pagamento -> localizamos a Cobranca no banco DESSA empresa por
 * external_reference -> atualizamos status para PAGO quando aprovado.
 */
export async function POST(req: NextRequest, { params }: { params: { empresaId: string } }) {
  try {
    const body = await req.json();
    const paymentId: string | undefined = body?.data?.id ?? body?.id;
    const topic: string | undefined = body?.type ?? body?.topic;

    if (topic !== "payment" || !paymentId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const empresa = await controlPrisma.empresa.findUnique({ where: { id: params.empresaId } });
    if (!empresa?.mercadoPagoAccessTokenEnc) {
      return NextResponse.json({ ok: true, empresaSemMercadoPago: true });
    }

    const accessToken = decrypt(empresa.mercadoPagoAccessTokenEnc);
    const pagamento = await consultarPagamento(accessToken, String(paymentId));

    const cobrancaId: string | undefined = pagamento.external_reference;
    if (!cobrancaId) return NextResponse.json({ ok: true, semReferencia: true });

    const prisma = await getTenantPrisma(params.empresaId);
    const cobranca = await prisma.cobranca.findUnique({ where: { id: cobrancaId } });
    if (!cobranca) return NextResponse.json({ ok: true, cobrancaNaoEncontrada: true });

    if (pagamento.status === "approved") {
      await prisma.cobranca.update({
        where: { id: cobrancaId },
        data: { status: "PAGO", dataPagamento: new Date(), mercadoPagoId: String(pagamento.id) },
      });
    } else if (["cancelled", "rejected"].includes(pagamento.status)) {
      await prisma.cobranca.update({ where: { id: cobrancaId }, data: { status: "CANCELADO" } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook Mercado Pago:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
