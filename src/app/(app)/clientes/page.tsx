import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DeleteButton from "@/components/DeleteButton";
import { deleteCliente } from "./actions";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim();

  const clientes = await prisma.cliente.findMany({
    where: q
      ? { OR: [{ nome: { contains: q, mode: "insensitive" } }, { telefone: { contains: q } }] }
      : undefined,
    orderBy: { nome: "asc" },
    include: { _count: { select: { animais: true, assinaturas: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
        <Link href="/clientes/novo" className="btn-primary">+ Novo cliente</Link>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou telefone..."
          className="input max-w-sm"
        />
        <button className="btn-secondary" type="submit">Buscar</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Nome</th>
              <th>WhatsApp</th>
              <th>Animais</th>
              <th>Mensalista</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/clientes/${c.id}/editar`} className="text-brand-700 hover:underline font-medium">
                    {c.nome}
                  </Link>
                </td>
                <td>{c.telefone}</td>
                <td>{c._count.animais}</td>
                <td>
                  {c._count.assinaturas > 0 ? (
                    <span className="badge bg-brand-50 text-brand-700">Sim</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="text-right space-x-3 whitespace-nowrap">
                  <Link href={`/clientes/${c.id}/editar`} className="text-sm text-gray-600 hover:underline">
                    Editar
                  </Link>
                  <DeleteButton action={deleteCliente.bind(null, c.id)} confirmMessage={`Excluir cliente "${c.nome}"? Isso também remove os animais vinculados.`} />
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-6">Nenhum cliente encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
