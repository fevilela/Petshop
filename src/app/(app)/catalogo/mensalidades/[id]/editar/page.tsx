import { notFound } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import MensalidadeForm from "@/components/MensalidadeForm";
import { updateMensalidade } from "../../../actions";

export default async function EditarMensalidadePage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const mensalidade = await prisma.itemCatalogo.findUnique({ where: { id: params.id } });
  if (!mensalidade || mensalidade.tipo !== "MENSALIDADE") notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Editar mensalidade</h1>
      <MensalidadeForm action={updateMensalidade.bind(null, mensalidade.id)} defaultValues={mensalidade} />
    </div>
  );
}
