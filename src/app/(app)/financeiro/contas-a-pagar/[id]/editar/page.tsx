import { notFound } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import ContaForm from "@/components/ContaForm";
import { updateContaPagar } from "../../actions";

export default async function EditarContaPagarPage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const conta = await prisma.contaPagar.findUnique({ where: { id: params.id } });
  if (!conta) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Editar conta a pagar</h1>
      <ContaForm action={updateContaPagar.bind(null, conta.id)} defaultValues={conta} cancelHref="/financeiro/contas-a-pagar" />
    </div>
  );
}
