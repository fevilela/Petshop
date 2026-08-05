type ClienteParaBoleto = {
  nome: string;
  documento: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

/**
 * Valida se um cliente tem os dados que a API de boleto do Mercado Pago
 * exige — CPF/CNPJ e endereço completo (zip_code/street_name/street_number/
 * neighborhood/city/federal_unit, todos obrigatórios, confirmado via erro
 * real em produção). Usado nos três lugares que podem gerar um boleto:
 * venda avulsa (vendas/actions.ts), criação de assinatura
 * (src/lib/assinatura.ts) e geração de fatura mensal
 * (src/lib/faturamento.ts) — centralizado aqui pra não desalinhar a
 * mensagem de erro entre os três (e pra não esquecer de validar algum campo
 * num dos três lugares se a API do Mercado Pago exigir mais um dia).
 *
 * Retorna a mensagem de erro (pronta pra mostrar/logar) ou `null` se estiver tudo certo.
 */
export function validarClienteParaBoleto(cliente: ClienteParaBoleto): string | null {
  if (!cliente.documento) {
    return `Não é possível cobrar por boleto: ${cliente.nome} não tem CPF/CNPJ cadastrado. Edite o cliente ou escolha Pix/Link de pagamento.`;
  }
  const faltando = [
    !cliente.cep && "CEP",
    !cliente.logradouro && "rua",
    !cliente.numero && "número",
    !cliente.bairro && "bairro",
    !cliente.cidade && "cidade",
    !cliente.uf && "UF",
  ].filter((v): v is string => Boolean(v));

  if (faltando.length > 0) {
    return `Não é possível cobrar por boleto: falta o endereço completo de ${cliente.nome} (${faltando.join(", ")}). Edite o cliente ou escolha Pix/Link de pagamento.`;
  }
  return null;
}
