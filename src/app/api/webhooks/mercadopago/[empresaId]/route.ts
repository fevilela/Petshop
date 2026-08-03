import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const empresa = await prisma.empresa.findUnique({ where: { id: params.empresaId } });
    if (!empresa?.mercadoPagoAccessTokenEnc) {
      return NextResponse.json({ ok: true, empresaSemMercadoPago: true });
    }

    const accessToken = decrypt(empresa.mercadoPagoAccessTokenEnc);
    const pagamento = await consultarPagamento(accessToken, String(paymentId));

    const cobrancaId: string | undefined = pagamento.external_reference;
    if (!cobrancaId) return NextResponse.json({ ok: true, semReferencia: true });

    // Client escopado pela empresa da URL: garante que este webhook nunca
    // consegue mexer numa Cobranca de outra empresa, mesmo que o
    // external_reference tenha sido manipulado.
    const tenantPrisma = getTenantPrisma(params.empresaId);
    const cobranca = await tenantPrisma.cobranca.findUnique({ where: { id: cobrancaId } });
    if (!cobranca) return NextResponse.json({ ok: true, cobrancaNaoEncontrada: true });

    // Guarda contra status !== "PENDENTE": o Mercado Pago reenvia a mesma
    // notificação várias vezes até receber 200 (e às vezes reenvia por
    // engano mesmo depois disso). Sem esse guard, cada reentrega reescrevia
    // `dataPagamento` para o horário do reprocessamento em vez do pagamento
    // real, e uma cobrança já cancelada manualmente podia voltar a "PAGO".
    if (pagamento.status === "approved" && cobranca.status === "PENDENTE") {
      await tenantPrisma.cobranca.update({
        where: { id: cobrancaId },
        data: {
          status: "PAGO",
          dataPagamento: pagamento.date_approved ? new Date(pagamento.date_approved) : new Date(),
          mercadoPagoId: String(pagamento.id),
        },
      });
    } else if (["cancelled", "rejected"].includes(pagamento.status) && cobranca.status === "PENDENTE") {
      await tenantPrisma.cobranca.update({ where: { id: cobrancaId }, data: { status: "CANCELADO" } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook Mercado Pago:", err);
    // 500 de propósito: um erro aqui pode ser transitório (banco
    // momentaneamente fora, Mercado Pago instável) — devolver não-2xx faz o
    // MP tentar de novo mais tarde em vez de perder a notificação de vez.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/** O Mercado Pago às vezes faz uma checagem GET ao salvar a URL do webhook no painel dele. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
