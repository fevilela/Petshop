import { notFound } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import ServicoForm from "@/components/ServicoForm";
import { updateServico } from "../../../actions";

export default async function EditarServicoPage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const servico = await prisma.servico.findUnique({ where: { id: params.id } });
  if (!servico) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Editar serviço</h1>
      <ServicoForm action={updateServico.bind(null, servico.id)} defaultValues={servico} />
    </div>
  );
}
