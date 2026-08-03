import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { formatCurrency, formatDate } from "@/lib/utils";
import DeleteButton from "@/components/DeleteButton";
import {
  addPlanoItem,
  removePlanoItem,
  createAssinatura,
  cancelarAssinatura,
} from "../actions";

export default async function PlanoDetalhePage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const [plano, produtos, servicos, clientes] = await Promise.all([
    prisma.plano.findUnique({
      where: { id: params.id },
      include: {
        itens: { include: { produto: true, servico: true } },
        assinaturas: { include: { cliente: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.servico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.cliente.findMany({ orderBy: { nome: "asc" } }),
  ]);

  if (!plano) notFound();

  const addProduto = addPlanoItem;
  const addServico = addPlanoItem;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{plano.nome}</h1>
          <p className="text-sm text-gray-500">{formatCurrency(Number(plano.valorMensal))}/mês · cobrança padrão dia {plano.diaCobrancaPadrao}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/planos/${plano.id}/editar`} className="btn-secondary">Editar plano</Link>
          <Link href="/planos" className="btn-secondary">Voltar</Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-medium text-gray-900 mb-3">Itens inclusos por mês</h2>
          <ul className="divide-y divide-gray-100 mb-4">
            {plano.itens.map((item) => (
              <li key={item.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  {item.quantidade}x {item.produto?.nome ?? item.servico?.nome}
                  <span className="text-gray-400"> ({item.produto ? "produto" : "serviço"})</span>
                </span>
                <DeleteButton
                  action={removePlanoItem.bind(null, plano.id, item.id)}
                  confirmMessage="Remover este item do plano?"
                />
              </li>
            ))}
            {plano.itens.length === 0 && <li className="py-2 text-sm text-gray-500">Nenhum item incluso ainda.</li>}
          </ul>

          <div className="grid sm:grid-cols-2 gap-3">
            <form action={addProduto} className="space-y-2 border-t pt-3">
              <input type="hidden" name="planoId" value={plano.id} />
              <input type="hidden" name="tipo" value="PRODUTO" />
              <label className="label">Adicionar produto</label>
              <select name="itemId" className="input" required>
                <option value="">Selecione...</option>
                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <input name="quantidade" type="number" min={1} defaultValue={1} className="input" placeholder="Quantidade/mês" />
              <button type="submit" className="btn-secondary w-full">+ Adicionar</button>
            </form>
            <form action={addServico} className="space-y-2 border-t pt-3">
              <input type="hidden" name="planoId" value={plano.id} />
              <input type="hidden" name="tipo" value="SERVICO" />
              <label className="label">Adicionar serviço</label>
              <select name="itemId" className="input" required>
                <option value="">Selecione...</option>
                {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <input name="quantidade" type="number" min={1} defaultValue={1} className="input" placeholder="Quantidade/mês" />
              <button type="submit" className="btn-secondary w-full">+ Adicionar</button>
            </form>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-medium text-gray-900 mb-3">Assinantes</h2>
          <ul className="divide-y divide-gray-100 mb-4">
            {plano.assinaturas.map((a) => (
              <li key={a.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  {a.cliente.nome}
                  <span className="text-gray-400"> · desde {formatDate(a.dataInicio)} · dia {a.diaCobranca}</span>
                  {a.status !== "ATIVA" && <span className="badge bg-gray-100 text-gray-500 ml-2">{a.status}</span>}
                </span>
                {a.status === "ATIVA" && (
                  <DeleteButton
                    action={cancelarAssinatura.bind(null, plano.id, a.id)}
                    confirmMessage={`Cancelar assinatura de ${a.cliente.nome}?`}
                  />
                )}
              </li>
            ))}
            {plano.assinaturas.length === 0 && <li className="py-2 text-sm text-gray-500">Nenhum assinante ainda.</li>}
          </ul>

          <form action={createAssinatura} className="space-y-2 border-t pt-3">
            <input type="hidden" name="planoId" value={plano.id} />
            <label className="label">Assinar cliente a este plano</label>
            <select name="clienteId" className="input" required>
              <option value="">Selecione o cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input name="diaCobranca" type="number" min={1} max={28} className="input" placeholder={`Dia (padrão ${plano.diaCobrancaPadrao})`} />
              <input name="valorMensal" type="number" step="0.01" className="input" placeholder={`Valor (padrão ${plano.valorMensal})`} />
            </div>
            <button type="submit" className="btn-primary w-full">+ Assinar plano</button>
          </form>
        </div>
      </div>
    </div>
  );
}
