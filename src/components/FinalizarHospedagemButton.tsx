"use client";

import { finalizarHospedagem } from "@/app/(app)/canil/actions";

export default function FinalizarHospedagemButton({
  hospedagemId,
  canilId,
}: {
  hospedagemId: string;
  canilId: string;
}) {
  const action = finalizarHospedagem.bind(null, hospedagemId, canilId);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Confirmar check-out e liberar o canil?")) e.preventDefault();
      }}
    >
      <button type="submit" className="text-sm text-brand-700 hover:underline">Check-out</button>
    </form>
  );
}
