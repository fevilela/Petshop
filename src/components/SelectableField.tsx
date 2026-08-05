"use client";

/**
 * Campo somente-leitura (Pix copia-e-cola, linha digitável do boleto, link
 * de pagamento) que seleciona todo o texto ao ganhar foco, pra facilitar
 * copiar manualmente além do botão CopyButton ao lado.
 *
 * Precisa ser Client Component: CobrancaPainel (quem usa isto) é Server
 * Component, e um Server Component não pode passar um event handler comum
 * (onFocus) como prop de um elemento nativo — só Server Actions cruzam essa
 * fronteira serializadas, uma função qualquer não. Sem isolar isso aqui, a
 * página inteira quebra (ver bug real corrigido em 2026-08-05: só apareceu
 * quando o primeiro Pix com qrCode preenchido foi renderizado).
 */
export default function SelectableField({
  value,
  multiline = false,
  className,
}: {
  value: string;
  multiline?: boolean;
  className?: string;
}) {
  function selecionarTudo(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.select();
  }

  if (multiline) {
    return <textarea readOnly value={value} rows={3} className={className} onFocus={selecionarTudo} />;
  }
  return <input readOnly value={value} className={className} onFocus={selecionarTudo} />;
}
