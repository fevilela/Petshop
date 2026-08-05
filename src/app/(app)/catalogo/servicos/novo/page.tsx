import ServicoForm from "@/components/ServicoForm";
import { createServico } from "../../actions";

export default function NovoServicoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Novo serviço</h1>
      <ServicoForm action={createServico} />
    </div>
  );
}
