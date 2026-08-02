"use client";

import { atualizarStatusAgendamento } from "@/app/(app)/agenda/actions";

export default function AgendamentoStatusActions({ id, status }: { id: string; status: string }) {
  if (status === "CONCLUIDO" || status === "CANCELADO") return null;

  return (
    <div className="flex justify-end gap-3 whitespace-nowrap">
      {status === "AGENDADO" && (
        <form action={atualizarStatusAgendamento.bind(null, id, "CONFIRMADO")}>
          <button type="submit" className="text-sm text-brand-700 hover:underline">Confirmar</button>
        </form>
      )}
      <form action={atualizarStatusAgendamento.bind(null, id, "CONCLUIDO")}>
        <button type="submit" className="text-sm text-green-700 hover:underline">Concluir</button>
      </form>
      <form
        action={atualizarStatusAgendamento.bind(null, id, "CANCELADO")}
        onSubmit={(e) => {
          if (!confirm("Cancelar este agendamento?")) e.preventDefault();
        }}
      >
        <button type="submit" className="text-sm text-red-600 hover:underline">Cancelar</button>
      </form>
    </div>
  );
}
