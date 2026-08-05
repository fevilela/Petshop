"use client";

export default function DeleteButton({
  action,
  confirmMessage = "Tem certeza que deseja excluir este registro?",
  label = "Excluir",
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
  /** Texto do botão — "Excluir" por padrão, mas o componente também serve pra
   * qualquer ação destrutiva-com-confirmação (ex.: "Cancelar assinatura",
   * "Cancelar cobrança"), não só exclusão de fato. */
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button type="submit" className="text-red-600 hover:underline text-sm">
        {label}
      </button>
    </form>
  );
}
