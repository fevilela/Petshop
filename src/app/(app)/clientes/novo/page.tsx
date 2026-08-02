import ClienteForm from "@/components/ClienteForm";
import { createCliente } from "../actions";

export default function NovoClientePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Novo cliente</h1>
      <ClienteForm action={createCliente} />
    </div>
  );
}
