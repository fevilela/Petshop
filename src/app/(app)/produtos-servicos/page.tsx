import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import ToggleAtivoButton from "@/components/ToggleAtivoButton";
import { toggleProdutoAtivo, toggleServicoAtivo } from "./actions";

export default async function ProdutosServicosPage() {
  const [produtos, servicos] = await Promise.all([
    prisma.produto.findMany({ orderBy: { nome: "asc" } }),
    prisma.servico.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Produtos</h1>
          <Link href="/produtos-servicos/produtos/novo" className="btn-primary">+ Novo produto</Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Nome</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/produtos-servicos/produtos/${p.id}/editar`} className="text-brand-700 hover:underline font-medium">{p.nome}</Link>
                  </td>
                  <td>{p.categoria ?? "—"}</td>
                  <td>{formatCurrency(Number(p.preco))}</td>
                  <td>{p.estoque}</td>
                  <td>
                    <span className={`badge ${p.ativo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="text-right space-x-3 whitespace-nowrap">
                    <Link href={`/produtos-servicos/produtos/${p.id}/editar`} className="text-sm text-gray-600 hover:underline">Editar</Link>
                    <ToggleAtivoButton action={toggleProdutoAtivo.bind(null, p.id, p.ativo)} ativo={p.ativo} />
                  </td>
                </tr>
              ))}
              {produtos.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhum produto cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Serviços</h1>
          <Link href="/produtos-servicos/servicos/novo" className="btn-primary">+ Novo serviço</Link>
        </div>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Nome</th><th>Categoria</th><th>Preço</th><th>Duração</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/produtos-servicos/servicos/${s.id}/editar`} className="text-brand-700 hover:underline font-medium">{s.nome}</Link>
                  </td>
                  <td>{s.categoria ?? "—"}</td>
                  <td>{formatCurrency(Number(s.preco))}</td>
                  <td>{s.duracaoMinutos ? `${s.duracaoMinutos} min` : "—"}</td>
                  <td>
                    <span className={`badge ${s.ativo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="text-right space-x-3 whitespace-nowrap">
                    <Link href={`/produtos-servicos/servicos/${s.id}/editar`} className="text-sm text-gray-600 hover:underline">Editar</Link>
                    <ToggleAtivoButton action={toggleServicoAtivo.bind(null, s.id, s.ativo)} ativo={s.ativo} />
                  </td>
                </tr>
              ))}
              {servicos.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhum serviço cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
