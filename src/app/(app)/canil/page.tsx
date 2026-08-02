import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DeleteButton from "@/components/DeleteButton";
import { deleteCanil } from "./actions";

const STATUS_BADGE: Record<string, string> = {
  LIVRE: "bg-green-50 text-green-700",
  OCUPADO: "bg-amber-50 text-amber-700",
  MANUTENCAO: "bg-gray-100 text-gray-600",
};
const STATUS_LABEL: Record<string, string> = { LIVRE: "Livre", OCUPADO: "Ocupado", MANUTENCAO: "Manutenção" };

export default async function CanilPage() {
  const canis = await prisma.canil.findMany({ orderBy: { identificador: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Canil</h1>
        <div className="flex gap-2">
          <Link href="/canil/hospedagens" className="btn-secondary">Hospedagens</Link>
          <Link href="/canil/novo" className="btn-primary">+ Novo canil</Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {canis.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">{c.identificador}</h3>
              <span className={`badge ${STATUS_BADGE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Capacidade: {c.capacidade}</p>
            {c.observacoes && <p className="text-sm text-gray-500 mt-1">{c.observacoes}</p>}
            <div className="flex gap-3 mt-3">
              <Link href={`/canil/${c.id}/editar`} className="text-sm text-gray-600 hover:underline">Editar</Link>
              <DeleteButton action={deleteCanil.bind(null, c.id)} confirmMessage={`Excluir "${c.identificador}"?`} />
            </div>
          </div>
        ))}
        {canis.length === 0 && <p className="text-gray-500 text-sm">Nenhum canil cadastrado.</p>}
      </div>
    </div>
  );
}
