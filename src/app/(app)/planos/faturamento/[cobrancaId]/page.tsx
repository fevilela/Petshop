import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import CobrancaPainel from "@/components/CobrancaPainel";
import { marcarFaturaPagaAction, verificarPagamentoFaturaAction, marcarFaturaNotificadaAction } from "../actions";

export default async function FaturaDetalhePage({ params }: { params: { cobrancaId: string } }) {
  const { prisma } = await getSessionTenantPrisma();

  const cobranca = await prisma.cobranca.findUnique({
    where: { id: params.cobrancaId },
    include: {
      assinatura: { include: { cliente: true, itemCatalogo: true } },
      vendasFaturadas: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!cobranca || !cobranca.assinatura) notFound();

  const valorTotal = Number(cobranca.valor);
  const valorAvulsos = cobranca.vendasFaturadas.reduce((acc, v) => acc + Number(v.valorTotal), 0);
  const valorMensalidade = valorTotal - valorAvulsos;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/planos/faturamento" className="text-sm text-gray-500 hover:underline">
          ← Faturamento mensal
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">
          Fatura {cobranca.referenciaMes} — {cobranca.assinatura.cliente.nome}
        </h1>
        <p className="text-sm text-gray-500">{cobranca.assinatura.itemCatalogo.nome}</p>
      </div>

      <div className="card p-4">
        <h2 className="font-medium text-gray-900 mb-3">Composição</h2>
        <table className="table-base">
          <thead>
            <tr><th>Item</th><th>Data</th><th className="text-right">Valor</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Mensalidade ({cobranca.assinatura.itemCatalogo.nome})</td>
              <td className="text-gray-500">—</td>
              <td className="text-right">{formatCurrency(valorMensalidade)}</td>
            </tr>
            {cobranca.vendasFaturadas.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link href={`/vendas/${v.id}`} className="text-brand-700 hover:underline">
                    Venda #{v.numero}
                  </Link>
                </td>
                <td className="text-gray-500">{formatDateTime(v.createdAt)}</td>
                <td className="text-right">{formatCurrency(Number(v.valorTotal))}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td colSpan={2}>Total</td>
              <td className="text-right">{formatCurrency(valorTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h2 className="font-medium text-gray-900 mb-3">Cobrança</h2>
        <CobrancaPainel
          cobranca={{ ...cobranca, valor: valorTotal }}
          clienteNome={cobranca.assinatura.cliente.nome}
          clienteTelefone={cobranca.assinatura.cliente.telefone}
          marcarPagaAction={marcarFaturaPagaAction.bind(null, cobranca.id)}
          verificarPagamentoAction={verificarPagamentoFaturaAction.bind(null, cobranca.id)}
          marcarNotificadoAction={marcarFaturaNotificadaAction.bind(null, cobranca.id)}
          avisoFalhaGeracao="Não foi possível gerar o Pix desta fatura no Mercado Pago (token não configurado ou chamada falhou). Você ainda pode marcar como paga manualmente ou mandar o valor por outro meio."
        />
      </div>
    </div>
  );
}
