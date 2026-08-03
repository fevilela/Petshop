import { getSessionTenantPrisma } from "@/lib/session-tenant";
import ContaForm from "@/components/ContaForm";
import { createContaReceber } from "../actions";

export default async function NovaContaReceberPage() {
  const { prisma } = await getSessionTenantPrisma();
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Nova conta a receber</h1>
      <ContaForm
        action={createContaReceber}
        mostrarFornecedor={false}
        mostrarCategoria={false}
        clientes={clientes}
        cancelHref="/financeiro/contas-a-receber"
      />
    </div>
  );
}
