import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import { deleteContaReceber, marcarContaReceberRecebida } from "./actions";
import { marcarCobrancaPaga } from "../../vendas/actions";

const STATUS_BADGE: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-700",
  PAGO: "bg-green-50 text-green-700",
  VENCIDO: "bg-red-50 text-red-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

export default async function ContasReceberPage() {
  const hoje = new Date();
  const [contas, cobrancas] = await Promise.all([
    prisma.contaReceber.findMany({ orderBy: { dataVencimento: "asc" }, include: { cliente: true } }),
    prisma.cobranca.findMany({
      where: { status: { in: ["PENDENTE", "VENCIDO"] } },
      orderBy: { dataVencimento: "asc" },
      include: { venda: { include: { cliente: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Cobranças de vendas e mensalidades</h1>
            <p className="text-sm text-gray-500">Geradas automaticamente via boleto/Pix/link de pagamento.</p>
          </div>
        </div>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Cliente</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {cobrancas.map((c) => (
                <tr key={c.id}>
                  <td>{c.venda?.cliente.nome ?? "—"}</td>
                  <td>{c.tipo}</td>
                  <td>{formatCurrency(Number(c.valor))}</td>
                  <td>{formatDate(c.dataVencimento)}</td>
                  <td><span className={`badge ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
                  <td className="text-right">
                    <form action={marcarCobrancaPaga.bind(null, c.id)}>
                      <button type="submit" className="text-sm text-green-700 hover:underline">Marcar paga</button>
                    </form>
                  </td>
                </tr>
              ))}
              {cobrancas.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhuma cobrança pendente.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Outras contas a receber</h1>
          <Link href="/financeiro/contas-a-receber/novo" className="btn-primary">+ Nova conta</Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Descrição</th><th>Cliente</th><th>Valor</th><th>Vencimento</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {contas.map((c) => {
                const vencida = c.status === "PENDENTE" && c.dataVencimento < hoje;
                return (
                  <tr key={c.id}>
                    <td><Link href={`/financeiro/contas-a-receber/${c.id}/editar`} className="text-brand-700 hover:underline font-medium">{c.descricao}</Link></td>
                    <td>{c.cliente?.nome ?? "—"}</td>
                    <td>{formatCurrency(Number(c.valor))}</td>
                    <td>{formatDate(c.dataVencimento)}</td>
                    <td><span className={`badge ${STATUS_BADGE[vencida ? "VENCIDO" : c.status]}`}>{vencida ? "Vencido" : c.status}</span></td>
                    <td className="text-right space-x-3 whitespace-nowrap">
                      {c.status === "PENDENTE" && (
                        <form action={marcarContaReceberRecebida.bind(null, c.id)} className="inline">
                          <button type="submit" className="text-sm text-green-700 hover:underline">Marcar recebida</button>
                        </form>
                      )}
                      <Link href={`/financeiro/contas-a-receber/${c.id}/editar`} className="text-sm text-gray-600 hover:underline">Editar</Link>
                      <DeleteButton action={deleteContaReceber.bind(null, c.id)} confirmMessage={`Excluir "${c.descricao}"?`} />
                    </td>
                  </tr>
                );
              })}
              {contas.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhuma conta cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
