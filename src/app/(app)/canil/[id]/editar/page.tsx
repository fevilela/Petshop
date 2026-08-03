import { notFound } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import CanilForm from "@/components/CanilForm";
import { updateCanil } from "../../actions";

export default async function EditarCanilPage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const canil = await prisma.canil.findUnique({ where: { id: params.id } });
  if (!canil) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Editar canil</h1>
      <CanilForm action={updateCanil.bind(null, canil.id)} defaultValues={canil} />
    </div>
  );
}
