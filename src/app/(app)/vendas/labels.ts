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
