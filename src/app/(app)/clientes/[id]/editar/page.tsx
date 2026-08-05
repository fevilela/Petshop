import { notFound } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import ClienteForm from "@/components/ClienteForm";
import { updateCliente } from "../../actions";
import { cancelarAssinatura } from "../../../planos/actions";

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const [cliente, mensalidades, assinaturaAtiva] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: params.id } }),
    prisma.itemCatalogo.findMany({ where: { tipo: "MENSALIDADE", ativo: true }, orderBy: { nome: "asc" } }),
    prisma.assinatura.findFirst({
      where: { clienteId: params.id, status: "ATIVA" },
      include: { itemCatalogo: true },
    }),
  ]);
  if (!cliente) notFound();

  const action = updateCliente.bind(null, cliente.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Editar cliente</h1>
      <ClienteForm
        action={action}
        defaultValues={cliente}
        mensalidades={mensalidades.map((m) => ({ id: m.id, nome: m.nome, preco: Number(m.preco), diaCobrancaPadrao: m.diaCobrancaPadrao }))}
        assinaturaAtiva={
          assinaturaAtiva
            ? {
                id: assinaturaAtiva.id,
                nomeMensalidade: assinaturaAtiva.itemCatalogo.nome,
                valorMensal: Number(assinaturaAtiva.valorMensal),
                diaCobranca: assinaturaAtiva.diaCobranca,
                formaCobranca: assinaturaAtiva.formaCobranca,
              }
            : null
        }
        cancelarAssinaturaAction={assinaturaAtiva ? cancelarAssinatura.bind(null, assinaturaAtiva.id) : undefined}
      />
    </div>
  );
}
