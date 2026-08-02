import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import { deleteContaPagar, marcarContaPagarPaga } from "./actions";

const STATUS_BADGE: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-700",
  PAGO: "bg-green-50 text-green-700",
  VENCIDO: "bg-red-50 text-red-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

export default async function ContasPagarPage() {
  const hoje = new Date();
  const contas = await prisma.contaPagar.findMany({ orderBy: { dataVencimento: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Contas a pagar</h1>
        <Link href="/financeiro/contas-a-pagar/novo" className="btn-primary">+ Nova conta</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Descrição</th><th>Fornecedor</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {contas.map((c) => {
              const vencida = c.status === "PENDENTE" && c.dataVencimento < hoje;
              return (
                <tr key={c.id}>
                  <td><Link href={`/financeiro/contas-a-pagar/${c.id}/editar`} className="text-brand-700 hover:underline font-medium">{c.descricao}</Link></td>
                  <td>{c.fornecedor ?? "—"}</td>
                  <td>{formatCurrency(Number(c.valor))}</td>
                  <td>{formatDate(c.dataVencimento)}</td>
                  <td><span className={`badge ${STATUS_BADGE[vencida ? "VENCIDO" : c.status]}`}>{vencida ? "Vencido" : c.status}</span></td>
                  <td className="text-right space-x-3 whitespace-nowrap">
                    {c.status === "PENDENTE" && (
                      <form action={marcarContaPagarPaga.bind(null, c.id)} className="inline">
                        <button type="submit" className="text-sm text-green-700 hover:underline">Marcar paga</button>
                      </form>
                    )}
                    <Link href={`/financeiro/contas-a-pagar/${c.id}/editar`} className="text-sm text-gray-600 hover:underline">Editar</Link>
                    <DeleteButton action={deleteContaPagar.bind(null, c.id)} confirmMessage={`Excluir "${c.descricao}"?`} />
                  </td>
                </tr>
              );
            })}
            {contas.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhuma conta cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
