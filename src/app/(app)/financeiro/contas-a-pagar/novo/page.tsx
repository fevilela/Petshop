import ContaForm from "@/components/ContaForm";
import { createContaPagar } from "../actions";

export default function NovaContaPagarPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Nova conta a pagar</h1>
      <ContaForm action={createContaPagar} cancelHref="/financeiro/contas-a-pagar" />
    </div>
  );
}
