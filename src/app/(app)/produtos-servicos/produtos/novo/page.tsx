import ProdutoForm from "@/components/ProdutoForm";
import { createProduto } from "../../actions";

export default function NovoProdutoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Novo produto</h1>
      <ProdutoForm action={createProduto} />
    </div>
  );
}
