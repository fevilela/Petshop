/**
 * Integração com a API do Mercado Pago (Fase 2).
 *
 * Multi-tenant: cada petshop-cliente usa a PRÓPRIA conta/token do Mercado
 * Pago (configurado em /configuracoes, guardado criptografado na Empresa).
 * Por isso toda função aqui recebe `accessToken` como parâmetro — quem
 * chama é responsável por descriptografar o token da empresa certa antes
 * (ver src/app/(app)/vendas/actions.ts).
 *
 * Usamos chamadas REST diretas (fetch) em vez do SDK oficial para manter
 * zero dependências extras — trade-off: perdemos tipagem forte do SDK,
 * ganhamos previsibilidade e um bundle menor.
 */

const MP_API_URL = "https://api.mercadopago.com";

/**
 * URL do webhook por empresa. Passamos ela explicitamente em toda chamada
 * que cria um pagamento (Pix, boleto, link) em vez de depender só da URL
 * configurada manualmente no painel do Mercado Pago de cada petshop-cliente
 * — assim o webhook funciona mesmo que o responsável pelo petshop nunca
 * tenha configurado nada lá (ver src/app/api/webhooks/mercadopago/[empresaId]).
 */
function notificationUrl(empresaId: string): string {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return `${appUrl}/api/webhooks/mercadopago/${empresaId}`;
}

/**
 * Separa "nome completo" (único campo que o Cliente tem) em first_name/
 * last_name — a API de boleto registrado do Mercado Pago exige os dois
 * separados (erro 400 "the following parameters are required: payer.
 * first_name, payer.last_name" se mandar tudo só em first_name, como o
 * código fazia antes). Cliente com um nome só (raro, mas existe): repete o
 * mesmo nome em last_name — não é ideal, mas evita bloquear a emissão do
 * boleto por causa de um campo que a API só usa pra exibição no boleto, não
 * pra validação de identidade (quem valida identidade é o CPF/CNPJ).
 */
function separarNome(nomeCompleto: string): { firstName: string; lastName: string } {
  const partes = nomeCompleto.trim().split(/\s+/);
  return {
    firstName: partes[0],
    lastName: partes.length > 1 ? partes.slice(1).join(" ") : partes[0],
  };
}

type CriarCobrancaInput = {
  cobrancaId: string; // id interno (Cobranca.id) — vira external_reference para conciliação no webhook
  empresaId: string; // usado para montar o notification_url por tenant (ver criarLinkPagamentoCartao)
  valor: number;
  descricao: string;
  clienteNome: string;
  clienteEmail?: string;
  clienteDocumento?: string; // CPF, obrigatório para boleto
  dataVencimento: Date;
};

/**
 * Gera um pagamento Pix direto (Payments API) com QR Code.
 * Retorna o payload "copia e cola" e a imagem em base64 para exibir/enviar.
 */
export async function criarPagamentoPix(accessToken: string, input: CriarCobrancaInput) {
  const res = await fetch(`${MP_API_URL}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.cobrancaId,
    },
    body: JSON.stringify({
      transaction_amount: input.valor,
      description: input.descricao,
      payment_method_id: "pix",
      external_reference: input.cobrancaId,
      date_of_expiration: input.dataVencimento.toISOString(),
      notification_url: notificationUrl(input.empresaId),
      payer: {
        email: input.clienteEmail || "cliente@petshop.local",
        first_name: input.clienteNome,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar Pix no Mercado Pago: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    mercadoPagoId: String(data.id),
    status: data.status as string,
    qrCode: data.point_of_interaction?.transaction_data?.qr_code as string | undefined,
    qrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64 as string | undefined,
  };
}

/**
 * Gera um boleto (Payments API, payment_method_id "bolbradesco").
 * Requer CPF/CNPJ do cliente.
 */
export async function criarBoleto(accessToken: string, input: CriarCobrancaInput) {
  if (!input.clienteDocumento) {
    throw new Error("Documento (CPF/CNPJ) do cliente é obrigatório para gerar boleto.");
  }
  const { firstName, lastName } = separarNome(input.clienteNome);

  const res = await fetch(`${MP_API_URL}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.cobrancaId,
    },
    body: JSON.stringify({
      transaction_amount: input.valor,
      description: input.descricao,
      payment_method_id: "bolbradesco",
      external_reference: input.cobrancaId,
      date_of_expiration: input.dataVencimento.toISOString(),
      notification_url: notificationUrl(input.empresaId),
      payer: {
        email: input.clienteEmail || "cliente@petshop.local",
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: input.clienteDocumento.replace(/\D/g, "").length > 11 ? "CNPJ" : "CPF",
          number: input.clienteDocumento.replace(/\D/g, ""),
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar boleto no Mercado Pago: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    mercadoPagoId: String(data.id),
    status: data.status as string,
    linkPagamento: data.transaction_details?.external_resource_url as string | undefined,
    linhaDigitavel: data.barcode?.content as string | undefined,
  };
}

/**
 * Gera um link de pagamento universal (Checkout Pro) que aceita cartão,
 * Pix e boleto na mesma tela — ideal para "link de pagamento por cartão".
 */
export async function criarLinkPagamentoCartao(accessToken: string, input: CriarCobrancaInput) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const res = await fetch(`${MP_API_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: input.descricao,
          quantity: 1,
          currency_id: "BRL",
          unit_price: input.valor,
        },
      ],
      external_reference: input.cobrancaId,
      payer: { name: input.clienteNome, email: input.clienteEmail },
      notification_url: notificationUrl(input.empresaId),
      back_urls: {
        success: `${appUrl}/vendas`,
        failure: `${appUrl}/vendas`,
        pending: `${appUrl}/vendas`,
      },
      auto_return: "approved",
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar link de pagamento: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    mercadoPagoId: String(data.id),
    linkPagamento: data.init_point as string,
  };
}

/** Consulta o status atual de um pagamento pelo id do Mercado Pago. */
export async function consultarPagamento(accessToken: string, mercadoPagoId: string) {
  const res = await fetch(`${MP_API_URL}/v1/payments/${mercadoPagoId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao consultar pagamento ${mercadoPagoId}: ${res.status}`);
  }
  return res.json();
}
