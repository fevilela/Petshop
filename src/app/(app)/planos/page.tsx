import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import ToggleAtivoButton from "@/components/ToggleAtivoButton";
import { togglePlanoAtivo } from "./actions";

export default async function PlanosPage() {
  const planos = await prisma.plano.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { assinaturas: true, itens: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Planos (Mensalistas)</h1>
          <p className="text-sm text-gray-500">Clientes que pagam mensalmente por um pacote de produtos/serviços.</p>
        </div>
        <Link href="/planos/novo" className="btn-primary">+ Novo plano</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Plano</th><th>Valor mensal</th><th>Itens inclusos</th><th>Assinantes</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {planos.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/planos/${p.id}`} className="text-brand-700 hover:underline font-medium">{p.nome}</Link></td>
                <td>{formatCurrency(Number(p.valorMensal))}</td>
                <td>{p._count.itens}</td>
                <td>{p._count.assinaturas}</td>
                <td>
                  <span className={`badge ${p.ativo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="text-right space-x-3 whitespace-nowrap">
                  <Link href={`/planos/${p.id}`} className="text-sm text-gray-600 hover:underline">Detalhes</Link>
                  <ToggleAtivoButton action={togglePlanoAtivo.bind(null, p.id, p.ativo)} ativo={p.ativo} />
                </td>
              </tr>
            ))}
            {planos.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhum plano cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
