import { NextResponse } from "next/server";

/**
 * DESATIVADA: agora que o sistema é multi-tenant, cada petshop-cliente tem
 * sua própria conta Mercado Pago e deve configurar seu webhook apontando
 * para /api/webhooks/mercadopago/<empresaId> (ver pasta [empresaId] ao
 * lado, e a tela de Configurações que mostra essa URL prontinha).
 *
 * Esta rota "flat" fica só para responder algo sensato caso alguma
 * integração antiga ainda esteja configurada apontando para cá.
 */
export async function POST() {
  return NextResponse.json(
    { ok: false, erro: "Use /api/webhooks/mercadopago/<empresaId> — ver tela de Configurações." },
    { status: 410 }
  );
}
