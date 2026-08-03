import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  ATIVA: "bg-green-50 text-green-700",
  SUSPENSA: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  ATIVA: "Ativa",
  SUSPENSA: "Suspensa",
};

export default async function EmpresasPage() {
  const empresas = await prisma.empresa.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { usuarios: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Petshops-clientes</h1>
          <p className="text-sm text-gray-500">Cada linha é uma conta com banco e credenciais próprios.</p>
        </div>
        <Link href="/admin/empresas/novo" className="btn-primary">+ Cadastrar petshop</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Petshop</th><th>Responsável</th><th>Usuários</th><th>Status</th><th>Criado em</th></tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link href={`/admin/empresas/${e.id}`} className="text-brand-700 hover:underline font-medium">
                    {e.nome}
                  </Link>
                </td>
                <td>{e.emailResponsavel}</td>
                <td>{e._count.usuarios}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                </td>
                <td className="text-gray-500">{formatDateTime(e.createdAt)}</td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-500 py-6">Nenhum petshop cadastrado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
