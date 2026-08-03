/**
 * Integração com a WhatsApp Cloud API (Meta) — Fase 2.
 *
 * Multi-tenant: cada petshop-cliente usa o PRÓPRIO número/API do WhatsApp
 * Business (configurado em /configuracoes, guardado na Empresa). Por isso
 * toda função aqui recebe as credenciais como parâmetro — quem chama busca
 * e descriptografa as credenciais da empresa certa antes.
 *
 * IMPORTANTE (regra da Meta): para iniciar uma conversa com o cliente
 * (ex: enviar um boleto sem que ele tenha mandado mensagem antes nas
 * últimas 24h), é OBRIGATÓRIO usar um "message template" pré-aprovado pela
 * Meta. Mensagens de texto livre (sendTextMessage) só funcionam dentro da
 * janela de 24h após o cliente ter escrito para o número do petshop.
 * Por isso as funções de cobrança usam sendTemplateMessage.
 */

const GRAPH_API_VERSION = "v20.0";

export type WhatsappCredenciais = {
  phoneNumberId: string;
  accessToken: string;
};

async function callGraphApi(creds: WhatsappCredenciais, body: unknown) {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${creds.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Falha ao enviar WhatsApp: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Envia uma mensagem por template aprovado (necessário para 1º contato / fora da janela de 24h).
 * Crie o template no WhatsApp Manager antes de usar, ex:
 *   nome: "cobranca_disponivel"
 *   corpo: "Olá {{1}}, sua cobrança de {{2}} referente a {{3}} está disponível: {{4}}"
 */
export async function sendTemplateMessage(
  creds: WhatsappCredenciais,
  telefoneE164: string,
  templateName: string,
  languageCode: string,
  parametros: string[]
) {
  return callGraphApi(creds, {
    messaging_product: "whatsapp",
    to: telefoneE164,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: parametros.map((text) => ({ type: "text", text })),
        },
      ],
    },
  });
}

/** Mensagem de texto livre — só entrega se o cliente já escreveu nas últimas 24h. */
export async function sendTextMessage(creds: WhatsappCredenciais, telefoneE164: string, texto: string) {
  return callGraphApi(creds, {
    messaging_product: "whatsapp",
    to: telefoneE164,
    type: "text",
    text: { body: texto },
  });
}

/** Envia um QR Code (imagem) por WhatsApp — usado para cobranças Pix. */
export async function sendImageMessage(
  creds: WhatsappCredenciais,
  telefoneE164: string,
  imageUrl: string,
  caption?: string
) {
  return callGraphApi(creds, {
    messaging_product: "whatsapp",
    to: telefoneE164,
    type: "image",
    image: { link: imageUrl, caption },
  });
}
