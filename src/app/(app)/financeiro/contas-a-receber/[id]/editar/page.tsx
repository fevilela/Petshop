import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ContaForm from "@/components/ContaForm";
import { updateContaReceber } from "../../actions";

export default async function EditarContaReceberPage({ params }: { params: { id: string } }) {
  const [conta, clientes] = await Promise.all([
    prisma.contaReceber.findUnique({ where: { id: params.id } }),
    prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  if (!conta) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Editar conta a receber</h1>
      <ContaForm
        action={updateContaReceber.bind(null, conta.id)}
        mostrarFornecedor={false}
        mostrarCategoria={false}
        clientes={clientes}
        defaultValues={conta}
        cancelHref="/financeiro/contas-a-receber"
      />
    </div>
  );
}
