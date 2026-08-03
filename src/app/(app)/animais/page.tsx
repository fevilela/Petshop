import Link from "next/link";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import DeleteButton from "@/components/DeleteButton";
import { deleteAnimal } from "./actions";

const PORTE_LABEL: Record<string, string> = { PEQUENO: "Pequeno", MEDIO: "Médio", GRANDE: "Grande" };

export default async function AnimaisPage({ searchParams }: { searchParams: { q?: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const q = searchParams.q?.trim();

  const animais = await prisma.animal.findMany({
    where: {
      ativo: true,
      ...(q
        ? { OR: [{ nome: { contains: q, mode: "insensitive" } }, { cliente: { nome: { contains: q, mode: "insensitive" } } }] }
        : {}),
    },
    orderBy: { nome: "asc" },
    include: { cliente: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Animais</h1>
        <Link href="/animais/novo" className="btn-primary">+ Novo animal</Link>
      </div>

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por animal ou tutor..." className="input max-w-sm" />
        <button className="btn-secondary" type="submit">Buscar</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Animal</th>
              <th>Tutor</th>
              <th>Espécie / Raça</th>
              <th>Porte</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {animais.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/animais/${a.id}/editar`} className="text-brand-700 hover:underline font-medium">
                    {a.nome}
                  </Link>
                </td>
                <td>{a.cliente.nome}</td>
                <td>{a.especie}{a.raca ? ` · ${a.raca}` : ""}</td>
                <td>{a.porte ? PORTE_LABEL[a.porte] : "—"}</td>
                <td className="text-right space-x-3 whitespace-nowrap">
                  <Link href={`/animais/${a.id}/editar`} className="text-sm text-gray-600 hover:underline">Editar</Link>
                  <DeleteButton action={deleteAnimal.bind(null, a.id)} confirmMessage={`Inativar "${a.nome}"?`} />
                </td>
              </tr>
            ))}
            {animais.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-500 py-6">Nenhum animal encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
