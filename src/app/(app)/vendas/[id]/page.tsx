import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { formatCurrency, formatDateTime, linkWhatsapp } from "@/lib/utils";
import CopyButton from "@/components/CopyButton";
import { FORMA_LABEL, COBRANCA_BADGE, TIPO_COBRANCA_LABEL, mensagemCobrancaWhatsapp } from "../labels";
import { marcarCobrancaPaga, enviarCobrancaWhatsapp, verificarPagamentoAction } from "../actions";

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
      itens: { include: { produto: true, servico: true, animal: true } },
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
                <td>{item.produto?.nome ?? item.servico?.nome ?? "—"}</td>
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
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <span className={`badge ${COBRANCA_BADGE[cobranca.status]}`}>{cobranca.status}</span>
              <span className="text-gray-500">
                {TIPO_COBRANCA_LABEL[cobranca.tipo] ?? cobranca.tipo} · {formatCurrency(Number(cobranca.valor))}
              </span>
              <span className="text-gray-500">
                Vencimento: {formatDateTime(cobranca.dataVencimento)}
              </span>
              {cobranca.dataPagamento && (
                <span className="text-gray-500">Pago em: {formatDateTime(cobranca.dataPagamento)}</span>
              )}
            </div>

            {!cobranca.mercadoPagoId && (
              <p className="text-sm text-amber-700">
                Não foi possível gerar essa cobrança no Mercado Pago (token não configurado ou
                chamada falhou). Confira as credenciais em /configuracoes — depois disso é preciso
                registrar uma nova venda, esta cobrança não tem como ser regerada automaticamente.
              </p>
            )}

            {cobranca.tipo === "PIX" && cobranca.qrCode && (
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">Pix Copia e Cola</p>
                {cobranca.qrCodeBase64 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${cobranca.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-40 h-40 border border-gray-200 rounded-md"
                  />
                )}
                <div className="flex items-start gap-2">
                  <textarea
                    readOnly
                    value={cobranca.qrCode}
                    rows={3}
                    className="input text-xs font-mono flex-1"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <CopyButton value={cobranca.qrCode} label="Copiar código" />
                </div>
              </div>
            )}

            {cobranca.tipo === "BOLETO" && cobranca.linhaDigitavel && (
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">Linha digitável</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={cobranca.linhaDigitavel}
                    className="input text-xs font-mono flex-1"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <CopyButton value={cobranca.linhaDigitavel} />
                </div>
                {cobranca.linkPagamento && (
                  <a
                    href={cobranca.linkPagamento}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-sm inline-block"
                  >
                    Abrir boleto
                  </a>
                )}
              </div>
            )}

            {cobranca.tipo === "CARTAO_LINK" && cobranca.linkPagamento && (
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">Link de pagamento</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={cobranca.linkPagamento}
                    className="input text-xs flex-1"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <CopyButton value={cobranca.linkPagamento} />
                </div>
                <a
                  href={cobranca.linkPagamento}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-sm inline-block"
                >
                  Abrir link de pagamento
                </a>
              </div>
            )}

            {cobranca.enviadoWhatsappEm && (
              <p className="text-xs text-gray-400">
                Enviado por WhatsApp em {formatDateTime(cobranca.enviadoWhatsappEm)}.
              </p>
            )}

            {cobranca.status === "PENDENTE" && (
              <div className="border-t pt-4 flex flex-wrap gap-3">
                <form action={marcarCobrancaPaga.bind(null, cobranca.id)}>
                  <button type="submit" className="btn-secondary text-sm">Marcar paga</button>
                </form>
                {cobranca.mercadoPagoId && (
                  <form action={verificarPagamentoAction.bind(null, cobranca.id)}>
                    <button type="submit" className="btn-secondary text-sm">Verificar pagamento agora</button>
                  </form>
                )}
                <a
                  href={linkWhatsapp(
                    venda.cliente.telefone,
                    mensagemCobrancaWhatsapp({
                      clienteNome: venda.cliente.nome,
                      valor: Number(cobranca.valor),
                      tipo: cobranca.tipo,
                      linkOuCodigo: cobranca.linkPagamento || cobranca.qrCode,
                    })
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-sm"
                >
                  Abrir no WhatsApp
                </a>
                <form action={enviarCobrancaWhatsapp.bind(null, cobranca.id)}>
                  <button type="submit" className="btn-secondary text-sm">Enviar automático (Cloud API)</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
