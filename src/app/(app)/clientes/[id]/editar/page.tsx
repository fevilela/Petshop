import { notFound } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import ClienteForm from "@/components/ClienteForm";
import { updateCliente } from "../../actions";

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const cliente = await prisma.cliente.findUnique({ where: { id: params.id } });
  if (!cliente) notFound();

  const action = updateCliente.bind(null, cliente.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Editar cliente</h1>
      <ClienteForm action={action} defaultValues={cliente} />
    </div>
  );
}
