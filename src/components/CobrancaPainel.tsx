import CopyButton from "@/components/CopyButton";
import { formatCurrency, formatDateTime, linkWhatsapp } from "@/lib/utils";
import { COBRANCA_BADGE, TIPO_COBRANCA_LABEL, mensagemCobrancaWhatsapp } from "@/lib/cobranca-labels";

type CobrancaExibicao = {
  id: string;
  status: string;
  tipo: string;
  valor: number;
  dataVencimento: Date;
  dataPagamento: Date | null;
  mercadoPagoId: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  linhaDigitavel: string | null;
  linkPagamento: string | null;
};

/**
 * Exibição de uma Cobranca (Pix/boleto/link, status, ações) — compartilhada
 * entre a tela de detalhe da venda (src/app/(app)/vendas/[id]) e a tela de
 * fatura mensal do mensalista (src/app/(app)/planos/faturamento/[id]), já
 * que as duas são, no fundo, a mesma Cobranca só com origem diferente
 * (vendaId vs. assinaturaId+referenciaMes).
 *
 * `marcarPagaAction`/`verificarPagamentoAction` chegam já vinculadas
 * (`.bind(null, cobranca.id)`) — Server Components podem passar Server
 * Actions já vinculadas como prop pra outro Server Component normalmente.
 */
export default function CobrancaPainel({
  cobranca,
  clienteNome,
  clienteTelefone,
  marcarPagaAction,
  verificarPagamentoAction,
  avisoFalhaGeracao,
}: {
  cobranca: CobrancaExibicao;
  clienteNome: string;
  clienteTelefone: string;
  marcarPagaAction: (formData: FormData) => Promise<void>;
  verificarPagamentoAction?: (formData: FormData) => Promise<void>;
  avisoFalhaGeracao?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <span className={`badge ${COBRANCA_BADGE[cobranca.status]}`}>{cobranca.status}</span>
        <span className="text-gray-500">
          {TIPO_COBRANCA_LABEL[cobranca.tipo] ?? cobranca.tipo} · {formatCurrency(cobranca.valor)}
        </span>
        <span className="text-gray-500">Vencimento: {formatDateTime(cobranca.dataVencimento)}</span>
        {cobranca.dataPagamento && (
          <span className="text-gray-500">Pago em: {formatDateTime(cobranca.dataPagamento)}</span>
        )}
      </div>

      {!cobranca.mercadoPagoId && (
        <p className="text-sm text-amber-700">
          {avisoFalhaGeracao ??
            "Não foi possível gerar essa cobrança no Mercado Pago (token não configurado ou chamada falhou)."}
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

      {cobranca.status === "PENDENTE" && (
        <div className="border-t pt-4 flex flex-wrap gap-3">
          <form action={marcarPagaAction}>
            <button type="submit" className="btn-secondary text-sm">Marcar paga</button>
          </form>
          {cobranca.mercadoPagoId && verificarPagamentoAction && (
            <form action={verificarPagamentoAction}>
              <button type="submit" className="btn-secondary text-sm">Verificar pagamento agora</button>
            </form>
          )}
          <a
            href={linkWhatsapp(
              clienteTelefone,
              mensagemCobrancaWhatsapp({
                clienteNome,
                valor: cobranca.valor,
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
        </div>
      )}
    </div>
  );
}
