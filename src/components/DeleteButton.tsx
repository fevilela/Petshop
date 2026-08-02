"use client";

export default function DeleteButton({
  action,
  confirmMessage = "Tem certeza que deseja excluir este registro?",
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button type="submit" className="text-red-600 hover:underline text-sm">
        Excluir
      </button>
    </form>
  );
}
