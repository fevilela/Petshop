import Link from "next/link";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { marcarCobrancaPaga, enviarCobrancaWhatsapp } from "./actions";

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX_MANUAL: "Pix (manual)",
  CARTAO_MANUAL: "Cartão (manual)",
  BOLETO: "Boleto",
  PIX_MERCADOPAGO: "Pix (Mercado Pago)",
  CARTAO_LINK: "Link de pagamento",
  MENSALISTA: "Mensalista",
};

const COBRANCA_BADGE: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-700",
  PAGO: "bg-green-50 text-green-700",
  VENCIDO: "bg-red-50 text-red-700",
  CANCELADO: "bg-gray-100 text-gray-500",
};

export default async function VendasPage() {
  const { prisma } = await getSessionTenantPrisma();
  const vendas = await prisma.venda.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      cliente: true,
      animal: true,
      itens: true,
      cobranca: true,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Histórico de vendas</h1>
        <Link href="/vendas/novo" className="btn-primary">+ Nova venda</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>#</th><th>Cliente</th><th>Itens</th><th>Forma</th><th>Total</th><th>Cobrança</th><th>Data</th><th></th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id}>
                <td>{v.numero}</td>
                <td>{v.cliente.nome}{v.animal ? <span className="text-gray-400"> · {v.animal.nome}</span> : ""}</td>
                <td>{v.itens.length}</td>
                <td>{FORMA_LABEL[v.formaPagamento] ?? v.formaPagamento}</td>
                <td>{formatCurrency(Number(v.valorTotal))}</td>
                <td>
                  {v.cobranca ? (
                    <span className={`badge ${COBRANCA_BADGE[v.cobranca.status]}`}>{v.cobranca.status}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="text-gray-500">{formatDateTime(v.createdAt)}</td>
                <td className="text-right space-x-3 whitespace-nowrap">
                  {v.cobranca && v.cobranca.status === "PENDENTE" && (
                    <>
                      <form action={marcarCobrancaPaga.bind(null, v.cobranca.id)} className="inline">
                        <button type="submit" className="text-sm text-green-700 hover:underline">Marcar paga</button>
                      </form>
                      <form action={enviarCobrancaWhatsapp.bind(null, v.cobranca.id)} className="inline">
                        <button type="submit" className="text-sm text-brand-700 hover:underline">Enviar WhatsApp</button>
                      </form>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {vendas.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-500 py-6">Nenhuma venda registrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
