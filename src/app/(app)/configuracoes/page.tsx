import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { atualizarConfiguracoesAction } from "./actions";

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.empresaId) redirect("/login");

  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: session.user.empresaId } });
  const somenteLeitura = session.user.role !== "EMPRESA_ADMIN";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">
          Credenciais próprias do {empresa.nome} para gerar cobranças e enviar mensagens de WhatsApp.
        </p>
      </div>

      {somenteLeitura && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Só o administrador do petshop pode alterar estas configurações.
        </p>
      )}

      <form action={atualizarConfiguracoesAction} className="card p-6 space-y-6 max-w-xl">
        <div>
          <h2 className="font-medium text-gray-900 mb-2">Mercado Pago</h2>
          <label className="label" htmlFor="mercadoPagoAccessToken">Access Token de produção</label>
          <input
            id="mercadoPagoAccessToken"
            name="mercadoPagoAccessToken"
            className="input"
            placeholder={empresa.mercadoPagoAccessTokenEnc ? "•••••••• (configurado — digite para trocar)" : "APP_USR-..."}
            disabled={somenteLeitura}
          />
          <p className="text-xs text-gray-500 mt-1">
            Obtenha em mercadopago.com.br/developers/panel, na sua própria conta Mercado Pago.
          </p>
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
            <p className="text-xs text-gray-500">
              Cole esta URL no painel do Mercado Pago (Suas integrações → Webhooks) para receber confirmação automática de pagamentos:
            </p>
            <code className="text-xs break-all">
              {(process.env.APP_URL || "http://localhost:3000") + "/api/webhooks/mercadopago/" + empresa.id}
            </code>
          </div>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-medium text-gray-900 mb-2">WhatsApp Cloud API</h2>
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="whatsappPhoneNumberId">Phone Number ID</label>
              <input
                id="whatsappPhoneNumberId"
                name="whatsappPhoneNumberId"
                className="input"
                defaultValue={empresa.whatsappPhoneNumberId ?? ""}
                disabled={somenteLeitura}
              />
            </div>
            <div>
              <label className="label" htmlFor="whatsappBusinessAccountId">Business Account ID</label>
              <input
                id="whatsappBusinessAccountId"
                name="whatsappBusinessAccountId"
                className="input"
                defaultValue={empresa.whatsappBusinessAccountId ?? ""}
                disabled={somenteLeitura}
              />
            </div>
            <div>
              <label className="label" htmlFor="whatsappAccessToken">Access Token</label>
              <input
                id="whatsappAccessToken"
                name="whatsappAccessToken"
                className="input"
                placeholder={empresa.whatsappAccessTokenEnc ? "•••••••• (configurado — digite para trocar)" : ""}
                disabled={somenteLeitura}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Obtenha em developers.facebook.com, criando um app com o produto WhatsApp.
          </p>
        </div>

        {!somenteLeitura && (
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        )}
      </form>
    </div>
  );
}
