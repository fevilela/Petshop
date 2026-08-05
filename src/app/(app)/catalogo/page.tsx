import Link from "next/link";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { formatCurrency } from "@/lib/utils";
import ToggleAtivoButton from "@/components/ToggleAtivoButton";
import { toggleItemCatalogoAtivo } from "./actions";

/**
 * Catálogo único (Produtos, Serviços e Mensalidades no mesmo cadastro,
 * diferenciados por `tipo`) — substitui a antiga /produtos-servicos +
 * a criação de "Plano" que ficava em /planos. Mantém a mesma UI de três
 * blocos empilhados por familiaridade, só que lendo de uma tabela só.
 */
export default async function CatalogoPage() {
  const { prisma } = await getSessionTenantPrisma();
  const itens = await prisma.itemCatalogo.findMany({ orderBy: { nome: "asc" } });

  const produtos = itens.filter((i) => i.tipo === "PRODUTO");
  const servicos = itens.filter((i) => i.tipo === "SERVICO");
  const mensalidades = itens.filter((i) => i.tipo === "MENSALIDADE");

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Produtos</h1>
          <Link href="/catalogo/produtos/novo" className="btn-primary">+ Novo produto</Link>
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
                    <Link href={`/catalogo/produtos/${p.id}/editar`} className="text-brand-700 hover:underline font-medium">{p.nome}</Link>
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
                    <Link href={`/catalogo/produtos/${p.id}/editar`} className="text-sm text-gray-600 hover:underline">Editar</Link>
                    <ToggleAtivoButton action={toggleItemCatalogoAtivo.bind(null, p.id, p.ativo)} ativo={p.ativo} />
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
          <Link href="/catalogo/servicos/novo" className="btn-primary">+ Novo serviço</Link>
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
                    <Link href={`/catalogo/servicos/${s.id}/editar`} className="text-brand-700 hover:underline font-medium">{s.nome}</Link>
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
                    <Link href={`/catalogo/servicos/${s.id}/editar`} className="text-sm text-gray-600 hover:underline">Editar</Link>
                    <ToggleAtivoButton action={toggleItemCatalogoAtivo.bind(null, s.id, s.ativo)} ativo={s.ativo} />
                  </td>
                </tr>
              ))}
              {servicos.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhum serviço cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Mensalidades</h1>
          <Link href="/catalogo/mensalidades/novo" className="btn-primary">+ Nova mensalidade</Link>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Pra assinar um cliente a uma mensalidade, use o cadastro do cliente ou venda a
          mensalidade na tela de Vendas — aqui é só o catálogo (nome, valor, dia de cobrança padrão).
        </p>
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Nome</th><th>Valor mensal</th><th>Dia de cobrança padrão</th><th>Assinantes</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {mensalidades.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/catalogo/mensalidades/${m.id}/editar`} className="text-brand-700 hover:underline font-medium">{m.nome}</Link>
                  </td>
                  <td>{formatCurrency(Number(m.preco))}</td>
                  <td>Dia {m.diaCobrancaPadrao}</td>
                  <td>
                    <Link href={`/planos/${m.id}`} className="text-brand-700 hover:underline">Ver assinantes</Link>
                  </td>
                  <td>
                    <span className={`badge ${m.ativo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {m.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="text-right space-x-3 whitespace-nowrap">
                    <Link href={`/catalogo/mensalidades/${m.id}/editar`} className="text-sm text-gray-600 hover:underline">Editar</Link>
                    <ToggleAtivoButton action={toggleItemCatalogoAtivo.bind(null, m.id, m.ativo)} ativo={m.ativo} />
                  </td>
                </tr>
              ))}
              {mensalidades.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-6">Nenhuma mensalidade cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
