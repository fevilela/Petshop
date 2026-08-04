/**
 * Envio de e-mail via Resend (API REST direta, sem SDK — mesmo padrão usado
 * em lib/mercadopago.ts).
 *
 * Requer no .env: RESEND_API_KEY e RESEND_FROM_EMAIL (precisa ser um
 * domínio verificado na Resend, ver resend.com/domains).
 */
export async function enviarEmail(params: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY / RESEND_FROM_EMAIL não configurados no .env.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao enviar e-mail via Resend: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export function templateConviteHtml(params: { nomeEmpresa: string; linkConvite: string }) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #24824a;">Bem-vindo(a) ao Petshop CRM</h2>
      <p>Você foi cadastrado(a) para acessar o sistema em nome de <strong>${params.nomeEmpresa}</strong>.</p>
      <p>Clique no botão abaixo para criar sua senha de acesso (o link expira em 48 horas):</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${params.linkConvite}"
           style="background: #2f9e5c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          Criar minha senha
        </a>
      </p>
      <p style="color: #666; font-size: 12px;">Se você não esperava este e-mail, pode ignorá-lo.</p>
    </div>
  `;
}
