import Link from "next/link";
import { controlPrisma } from "@/lib/control-prisma";
import { formatDateTime } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  PROVISIONANDO: "bg-amber-50 text-amber-700",
  ATIVA: "bg-green-50 text-green-700",
  ERRO_PROVISIONAMENTO: "bg-red-50 text-red-700",
  SUSPENSA: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  PROVISIONANDO: "Provisionando...",
  ATIVA: "Ativa",
  ERRO_PROVISIONAMENTO: "Erro no provisionamento",
  SUSPENSA: "Suspensa",
};

export default async function EmpresasPage() {
  const empresas = await controlPrisma.empresa.findMany({
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
                  {e.status === "ERRO_PROVISIONAMENTO" && e.provisionamentoErro && (
                    <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={e.provisionamentoErro}>
                      {e.provisionamentoErro}
                    </p>
                  )}
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

      <p className="text-xs text-gray-400">
        Provisionamento novo leva de 1 a 4 minutos (criação do banco na Supabase + migrations). Recarregue esta página para ver o status atualizar.
      </p>
    </div>
  );
}
