import CanilForm from "@/components/CanilForm";
import { createCanil } from "../actions";

export default function NovoCanilPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Novo canil</h1>
      <CanilForm action={createCanil} />
    </div>
  );
}
