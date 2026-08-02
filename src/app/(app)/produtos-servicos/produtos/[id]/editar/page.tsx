import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProdutoForm from "@/components/ProdutoForm";
import { updateProduto } from "../../../actions";

export default async function EditarProdutoPage({ params }: { params: { id: string } }) {
  const produto = await prisma.produto.findUnique({ where: { id: params.id } });
  if (!produto) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Editar produto</h1>
      <ProdutoForm action={updateProduto.bind(null, produto.id)} defaultValues={produto} />
    </div>
  );
}
