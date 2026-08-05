import { getSessionTenantPrisma } from "@/lib/session-tenant";
import ClienteForm from "@/components/ClienteForm";
import { createCliente } from "../actions";

export default async function NovoClientePage() {
  const { prisma } = await getSessionTenantPrisma();
  const mensalidades = await prisma.itemCatalogo.findMany({
    where: { tipo: "MENSALIDADE", ativo: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Novo cliente</h1>
      <ClienteForm
        action={createCliente}
        mensalidades={mensalidades.map((m) => ({ id: m.id, nome: m.nome, preco: Number(m.preco), diaCobrancaPadrao: m.diaCobrancaPadrao }))}
      />
    </div>
  );
}
