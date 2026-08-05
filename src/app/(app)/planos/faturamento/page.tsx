import Link from "next/link";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { formatCurrency } from "@/lib/utils";
import { calcularPreviaFatura, referenciaMesAtual } from "@/lib/faturamento";
import { gerarFaturaAction } from "./actions";

export default async function FaturamentoPage() {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const referenciaMes = referenciaMesAtual();

  const assinaturas = await prisma.assinatura.findMany({
    where: { status: "ATIVA" },
    include: { cliente: true, itemCatalogo: true },
    orderBy: { cliente: { nome: "asc" } },
  });

  // Sequencial de propósito (não Promise.all): cada chamada já faz 3 queries
  // (assinatura+cliente+plano, vendas avulsas, cobrança existente) — com
  // muitos mensalistas, paralelizar tudo de uma vez teria pouco ganho real
  // (mesmo Postgres, mesma conexão via pool) e deixa o código mais simples
  // de acompanhar. Se a lista crescer muito, dá pra revisitar.
  const previas = [];
  for (const a of assinaturas) {
    previas.push(await calcularPreviaFatura(empresaId, a.id, referenciaMes));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Faturamento mensal</h1>
        <p className="text-sm text-gray-500">
          Mês de referência: <strong>{referenciaMes}</strong>. Mensalidade + compras avulsas
          lançadas na fatura (forma de pagamento &quot;Lançar na fatura mensal&quot; ao registrar
          uma venda). Faturas também são geradas automaticamente no dia de cobrança de cada
          assinatura, se o cron estiver configurado (ver README).
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Cliente</th><th>Mensalidade</th><th>Valor mensalidade</th><th>Avulsos</th><th>Total</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {previas.map((p) => (
              <tr key={p.assinaturaId}>
                <td>{p.clienteNome}</td>
                <td>{p.nomeMensalidade}</td>
                <td>{formatCurrency(p.valorMensalidade)}</td>
                <td>{p.valorAvulsos > 0 ? formatCurrency(p.valorAvulsos) : "—"}</td>
                <td className="font-medium">{formatCurrency(p.valorTotal)}</td>
                <td>
                  {p.jaGerada ? (
                    p.notificado ? (
                      <span className="badge bg-green-50 text-green-700">Enviada</span>
                    ) : (
                      <span className="badge bg-amber-50 text-amber-700">Gerada, aguardando envio</span>
                    )
                  ) : (
                    <span className="badge bg-gray-100 text-gray-500">Pendente</span>
                  )}
                </td>
                <td className="text-right">
                  {p.jaGerada && p.cobrancaId ? (
                    <Link href={`/planos/faturamento/${p.cobrancaId}`} className="text-sm text-brand-700 hover:underline">
                      Ver
                    </Link>
                  ) : (
                    <form action={gerarFaturaAction.bind(null, p.assinaturaId)}>
                      <button type="submit" className="text-sm text-brand-700 hover:underline">Gerar fatura</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {previas.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-500 py-6">Nenhum mensalista ativo.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
