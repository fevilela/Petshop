import Link from "next/link";
import { Prisma } from "@prisma/client";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { formatDateTime } from "@/lib/utils";
import AgendamentoStatusActions from "@/components/AgendamentoStatusActions";

const STATUS_BADGE: Record<string, string> = {
  AGENDADO: "bg-blue-50 text-blue-700",
  CONFIRMADO: "bg-brand-50 text-brand-700",
  EM_ANDAMENTO: "bg-amber-50 text-amber-700",
  CONCLUIDO: "bg-green-50 text-green-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

type AgendamentoComRelacoes = Prisma.AgendamentoGetPayload<{
  include: { cliente: true; animal: true; servico: true; canil: true };
}>;

export default async function AgendaPage() {
  const { prisma } = await getSessionTenantPrisma();
  const agendamentos: AgendamentoComRelacoes[] = await prisma.agendamento.findMany({
    where: { dataHoraInicio: { gte: new Date(new Date().setDate(new Date().getDate() - 1)) } },
    orderBy: { dataHoraInicio: "asc" },
    include: { cliente: true, animal: true, servico: true, canil: true },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Agenda</h1>
        <Link href="/agenda/novo" className="btn-primary">+ Novo agendamento</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Data / hora</th><th>Cliente</th><th>Animal</th><th>Serviço</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {agendamentos.map((a) => (
              <tr key={a.id}>
                <td>{formatDateTime(a.dataHoraInicio)}</td>
                <td>{a.cliente.nome}</td>
                <td>{a.animal.nome}</td>
                <td>{a.servico?.nome ?? (a.canil ? `Hospedagem · ${a.canil.identificador}` : "—")}</td>
                <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{STATUS_LABEL[a.status]}</span></td>
                <td className="text-right">
                  <AgendamentoStatusActions id={a.id} status={a.status} />
                </td>
              </tr>
            ))}
            {agendamentos.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhum agendamento próximo.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
