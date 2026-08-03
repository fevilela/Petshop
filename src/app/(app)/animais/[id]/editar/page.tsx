import { notFound } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import AnimalForm from "@/components/AnimalForm";
import { updateAnimal } from "../../actions";

export default async function EditarAnimalPage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const [animal, clientes] = await Promise.all([
    prisma.animal.findUnique({ where: { id: params.id } }),
    prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  if (!animal) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Editar animal</h1>
      <AnimalForm action={updateAnimal.bind(null, animal.id)} clientes={clientes} defaultValues={animal} />
    </div>
  );
}
