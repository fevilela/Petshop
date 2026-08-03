import { formatCurrency } from "@/lib/utils";

/** Labels/badges compartilhados entre a listagem e o detalhe de vendas. */

export const FORMA_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX_MANUAL: "Pix (manual)",
  CARTAO_MANUAL: "Cartão (manual)",
  BOLETO: "Boleto",
  PIX_MERCADOPAGO: "Pix (Mercado Pago)",
  CARTAO_LINK: "Link de pagamento",
  MENSALISTA: "Mensalista",
};

export const COBRANCA_BADGE: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-700",
  PAGO: "bg-green-50 text-green-700",
  VENCIDO: "bg-red-50 text-red-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

export const TIPO_COBRANCA_LABEL: Record<string, string> = {
  BOLETO: "Boleto",
  PIX: "Pix",
  CARTAO_LINK: "Link de pagamento",
};

/**
 * Texto padrão pra mandar a cobrança pelo link direto do WhatsApp (wa.me).
 * Mesmo teor da mensagem do template "cobranca_disponivel" usado no envio
 * automático via Cloud API, só que como texto livre (o wa.me não usa
 * template — é só um rascunho pro atendente revisar e enviar).
 */
export function mensagemCobrancaWhatsapp(params: {
  clienteNome: string;
  valor: number;
  tipo: string;
  linkOuCodigo?: string | null;
}): string {
  const tipoLabel = TIPO_COBRANCA_LABEL[params.tipo] ?? params.tipo;
  const base = `Olá ${params.clienteNome}, sua cobrança de ${formatCurrency(params.valor)} (${tipoLabel}) está disponível.`;
  return params.linkOuCodigo ? `${base}\n\n${params.linkOuCodigo}` : base;
}
