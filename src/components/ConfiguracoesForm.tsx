"use client";

import { useFormState, useFormStatus } from "react-dom";
import { atualizarConfiguracoesAction, type ConfiguracoesFormState } from "@/app/(app)/configuracoes/actions";

const ESTADO_INICIAL: ConfiguracoesFormState = { error: null, sucesso: false };

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

/**
 * Client component só por causa do `useFormState`/`useFormStatus` (React 18
 * — este projeto ainda não está no `useActionState` do React 19/Next 15).
 * Existe pra transformar uma falha inesperada no salvamento (ex:
 * ENCRYPTION_KEY ausente no servidor) numa mensagem inline, em vez do
 * formulário inteiro sumir atrás do "Application error" genérico do Next —
 * ver comentário em configuracoes/actions.ts.
 */
export default function ConfiguracoesForm({
  webhookUrl,
  mercadoPagoConfigurado,
  somenteLeitura,
}: {
  /** Já resolvida no servidor (page.tsx) — `process.env.APP_URL` não é
   * `NEXT_PUBLIC_*`, então não existe no bundle do cliente. */
  webhookUrl: string;
  mercadoPagoConfigurado: boolean;
  somenteLeitura: boolean;
}) {
  const [state, formAction] = useFormState(atualizarConfiguracoesAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="card p-6 space-y-6 max-w-xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="font-medium text-gray-900">Mercado Pago</h2>
          {mercadoPagoConfigurado ? (
            <span className="badge bg-green-50 text-green-700">✓ Configurado</span>
          ) : (
            <span className="badge bg-gray-100 text-gray-500">Não configurado</span>
          )}
        </div>
        <label className="label" htmlFor="mercadoPagoAccessToken">Access Token de produção</label>
        <input
          id="mercadoPagoAccessToken"
          name="mercadoPagoAccessToken"
          className="input"
          placeholder={mercadoPagoConfigurado ? "•••••••• (configurado — digite para trocar)" : "APP_USR-..."}
          disabled={somenteLeitura}
        />
        <p className="text-xs text-gray-500 mt-1">
          Obtenha em mercadopago.com.br/developers/panel, na sua própria conta Mercado Pago.
        </p>
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
          <p className="text-xs text-gray-500">
            Cole esta URL no painel do Mercado Pago (Suas integrações → Webhooks) para receber confirmação automática de pagamentos:
          </p>
          <code className="text-xs break-all">{webhookUrl}</code>
        </div>
      </div>

      <div className="border-t pt-4">
        <h2 className="font-medium text-gray-900 mb-2">WhatsApp</h2>
        <p className="text-sm text-gray-500">
          O envio de cobrança por WhatsApp é feito por link direto (wa.me) na tela da venda — não
          precisa configurar nenhuma credencial aqui. O sistema já sabe o telefone de cada
          cliente cadastrado.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}
      {state.sucesso && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          Configurações salvas.
        </p>
      )}

      {!somenteLeitura && (
        <div className="flex gap-2">
          <BotaoSalvar />
        </div>
      )}
    </form>
  );
}
