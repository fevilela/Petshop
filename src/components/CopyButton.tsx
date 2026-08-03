"use client";

import { useState } from "react";

/**
 * Botão pequeno de "copiar" reutilizável — usado no código Pix (copia e
 * cola), linha digitável do boleto e link de pagamento, na tela de detalhe
 * da venda. `navigator.clipboard` exige client component (por isso o "use
 * client" aqui em vez de deixar isso na page, que é Server Component).
 */
export default function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(value);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard API pode falhar (ex: contexto não-HTTPS, permissão
      // negada) — nesse caso o valor já está visível na tela pra copiar
      // manualmente, então só deixamos de dar feedback de sucesso.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="btn-secondary text-xs whitespace-nowrap"
      aria-live="polite"
    >
      {copiado ? "Copiado!" : label}
    </button>
  );
}
