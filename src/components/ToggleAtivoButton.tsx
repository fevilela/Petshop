"use client";

export default function ToggleAtivoButton({
  action,
  ativo,
}: {
  action: () => Promise<void>;
  ativo: boolean;
}) {
  return (
    <form action={action}>
      <button type="submit" className="text-sm text-gray-600 hover:underline">
        {ativo ? "Desativar" : "Ativar"}
      </button>
    </form>
  );
}
