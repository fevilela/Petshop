import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConfiguracoesForm from "@/components/ConfiguracoesForm";

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
          Credencial própria do {empresa.nome} para gerar cobranças no Mercado Pago.
        </p>
      </div>

      {somenteLeitura && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Só o administrador do petshop pode alterar estas configurações.
        </p>
      )}

      <ConfiguracoesForm
        webhookUrl={(process.env.APP_URL || "http://localhost:3000") + "/api/webhooks/mercadopago/" + empresa.id}
        mercadoPagoConfigurado={!!empresa.mercadoPagoAccessTokenEnc}
        somenteLeitura={somenteLeitura}
      />
    </div>
  );
}
