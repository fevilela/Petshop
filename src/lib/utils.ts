export function formatCurrency(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Normaliza telefone para o padrão E.164 exigido pela API do WhatsApp (ex: 5511999998888)
export function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

/**
 * Link "wa.me" — abre o WhatsApp (app ou web) com a mensagem pré-preenchida,
 * pra um humano clicar em enviar. Não depende de nenhuma credencial/API
 * configurada: funciona mesmo pro petshop que não passou pela aprovação da
 * Meta ainda. Complementa (não substitui) o envio automático via Cloud API.
 */
export function linkWhatsapp(telefoneRaw: string, mensagem: string): string {
  const telefone = normalizePhoneE164(telefoneRaw);
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
