import Link from "next/link";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { formatDate, formatCurrency } from "@/lib/utils";
import FinalizarHospedagemButton from "@/components/FinalizarHospedagemButton";

export default async function HospedagensPage() {
  const { prisma } = await getSessionTenantPrisma();
  const hospedagens = await prisma.hospedagem.findMany({
    orderBy: { checkIn: "desc" },
    include: { canil: true, animal: { include: { cliente: true } } },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Hospedagens</h1>
        <div className="flex gap-2">
          <Link href="/canil" className="btn-secondary">Voltar ao canil</Link>
          <Link href="/canil/hospedagens/novo" className="btn-primary">+ Novo check-in</Link>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Animal</th>
              <th>Canil</th>
              <th>Check-in</th>
              <th>Previsão saída</th>
              <th>Check-out</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {hospedagens.map((h) => (
              <tr key={h.id}>
                <td>{h.animal.nome} <span className="text-gray-400">· {h.animal.cliente.nome}</span></td>
                <td>{h.canil.identificador}</td>
                <td>{formatDate(h.checkIn)}</td>
                <td>{h.checkOutPrevisto ? formatDate(h.checkOutPrevisto) : "—"}</td>
                <td>{h.checkOut ? formatDate(h.checkOut) : <span className="badge bg-amber-50 text-amber-700">Em andamento</span>}</td>
                <td className="text-right">
                  {!h.checkOut && <FinalizarHospedagemButton hospedagemId={h.id} canilId={h.canilId} />}
                </td>
              </tr>
            ))}
            {hospedagens.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhuma hospedagem registrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
