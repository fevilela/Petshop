import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import CobrancaPainel from "@/components/CobrancaPainel";
import { FORMA_LABEL } from "@/lib/cobranca-labels";
import { marcarCobrancaPaga, verificarPagamentoAction, marcarNotificadoAction, cancelarCobrancaAction } from "../actions";

/** Formas de pagamento que deveriam ter gerado uma Cobrança via Mercado Pago. */
const FORMAS_COM_COBRANCA = ["BOLETO", "PIX_MERCADOPAGO", "CARTAO_LINK"];

export default async function VendaDetalhePage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();

  const venda = await prisma.venda.findUnique({
    where: { id: params.id },
    include: {
      cliente: true,
      animal: true,
      criadoPor: true,
      itens: { include: { itemCatalogo: true, animal: true } },
      cobranca: true,
    },
  });
  if (!venda) notFound();

  const cobranca = venda.cobranca;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link href="/vendas" className="text-sm text-gray-500 hover:underline">
            ← Vendas
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">Venda #{venda.numero}</h1>
        </div>
      </div>

      <div className="card p-4 grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Cliente:</span> {venda.cliente.nome}
          {venda.cliente.telefone && (
            <span className="text-gray-400"> · {venda.cliente.telefone}</span>
          )}
        </div>
        <div>
          <span className="text-gray-500">Animal:</span> {venda.animal?.nome ?? "—"}
        </div>
        <div>
          <span className="text-gray-500">Forma de pagamento:</span>{" "}
          {FORMA_LABEL[venda.formaPagamento] ?? venda.formaPagamento}
        </div>
        <div>
          <span className="text-gray-500">Total:</span> {formatCurrency(Number(venda.valorTotal))}
        </div>
        <div>
          <span className="text-gray-500">Data:</span> {formatDateTime(venda.createdAt)}
        </div>
        <div>
          <span className="text-gray-500">Registrada por:</span> {venda.criadoPor?.nome ?? "—"}
        </div>
        {venda.observacoes && (
          <div className="sm:col-span-2">
            <span className="text-gray-500">Observações:</span> {venda.observacoes}
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-medium text-gray-900 mb-3">Itens</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>Item</th><th>Animal</th><th>Qtd.</th><th>Preço unit.</th><th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venda.itens.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.itemCatalogo.nome}
                  {item.itemCatalogo.tipo === "MENSALIDADE" && (
                    <span className="text-xs text-gray-400"> (assinatura — na fatura)</span>
                  )}
                </td>
                <td>{item.animal?.nome ?? "—"}</td>
                <td>{item.quantidade}</td>
                <td>{formatCurrency(Number(item.precoUnitario))}</td>
                <td>{formatCurrency(Number(item.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h2 className="font-medium text-gray-900 mb-3">Cobrança</h2>

        {!cobranca && FORMAS_COM_COBRANCA.includes(venda.formaPagamento) && (
          <p className="text-sm text-amber-700">
            Essa venda deveria ter gerado uma cobrança, mas nenhuma foi encontrada — algo falhou
            na hora de criar a venda. Confira os logs do servidor.
          </p>
        )}

        {!cobranca && !FORMAS_COM_COBRANCA.includes(venda.formaPagamento) && (
          <p className="text-sm text-gray-500">
            Forma de pagamento manual — esta venda não gerou cobrança pelo sistema.
          </p>
        )}

        {cobranca && (
          <CobrancaPainel
            cobranca={{ ...cobranca, valor: Number(cobranca.valor) }}
            clienteNome={venda.cliente.nome}
            clienteTelefone={venda.cliente.telefone}
            marcarPagaAction={marcarCobrancaPaga.bind(null, cobranca.id)}
            verificarPagamentoAction={verificarPagamentoAction.bind(null, cobranca.id)}
            marcarNotificadoAction={marcarNotificadoAction.bind(null, cobranca.id)}
            cancelarAction={cancelarCobrancaAction.bind(null, cobranca.id)}
            avisoFalhaGeracao="Não foi possível gerar essa cobrança no Mercado Pago (token não configurado ou chamada falhou). Confira as credenciais em /configuracoes — depois disso é preciso registrar uma nova venda, esta cobrança não tem como ser regerada automaticamente."
          />
        )}
      </div>
    </div>
  );
}
