import MensalidadeForm from "@/components/MensalidadeForm";
import { createMensalidade } from "../../actions";

export default function NovaMensalidadePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Nova mensalidade</h1>
      <MensalidadeForm action={createMensalidade} />
    </div>
  );
}
