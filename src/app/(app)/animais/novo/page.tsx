import { getSessionTenantPrisma } from "@/lib/session-tenant";
import AnimalForm from "@/components/AnimalForm";
import { createAnimal } from "../actions";

export default async function NovoAnimalPage() {
  const { prisma } = await getSessionTenantPrisma();
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Novo animal</h1>
      {clientes.length === 0 ? (
        <p className="text-sm text-gray-500">Cadastre um cliente antes de adicionar um animal.</p>
      ) : (
        <AnimalForm action={createAnimal} clientes={clientes} />
      )}
    </div>
  );
}
