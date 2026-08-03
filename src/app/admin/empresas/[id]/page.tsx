import { notFound } from "next/navigation";
import { controlPrisma } from "@/lib/control-prisma";
import { formatDateTime } from "@/lib/utils";
import {
  criarUsuarioAction,
  reenviarConviteAction,
  toggleUsuarioAtivoAction,
} from "../actions";

const STATUS_BADGE: Record<string, string> = {
  PROVISIONANDO: "bg-amber-50 text-amber-700",
  ATIVA: "bg-green-50 text-green-700",
  ERRO_PROVISIONAMENTO: "bg-red-50 text-red-700",
  SUSPENSA: "bg-gray-100 text-gray-500",
};

const ROLE_LABEL: Record<string, string> = {
  EMPRESA_ADMIN: "Administrador do petshop",
  EMPRESA_ATENDENTE: "Atendente",
};

export default async function EmpresaDetalhePage({ params }: { params: { id: string } }) {
  const empresa = await controlPrisma.empresa.findUnique({
    where: { id: params.id },
    include: { usuarios: { orderBy: { createdAt: "asc" } } },
  });
  if (!empresa) notFound();

  const criarUsuario = criarUsuarioAction.bind(null, empresa.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{empresa.nome}</h1>
        <span className={`badge ${STATUS_BADGE[empresa.status]}`}>{empresa.status}</span>
        {empresa.provisionamentoErro && (
          <p className="text-sm text-red-600 mt-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {empresa.provisionamentoErro}
          </p>
        )}
      </div>

      <div className="card p-4 grid sm:grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">Responsável:</span> {empresa.emailResponsavel}</div>
        <div><span className="text-gray-500">CNPJ:</span> {empresa.documento ?? "—"}</div>
        <div><span className="text-gray-500">Projeto Supabase:</span> {empresa.supabaseProjectRef ?? "—"}</div>
        <div><span className="text-gray-500">Região:</span> {empresa.supabaseProjectRegion ?? "—"}</div>
        <div><span className="text-gray-500">Criado em:</span> {formatDateTime(empresa.createdAt)}</div>
      </div>

      <div className="card p-4">
        <h2 className="font-medium text-gray-900 mb-3">Usuários com acesso</h2>
        <ul className="divide-y divide-gray-100 mb-4">
          {empresa.usuarios.map((u) => (
            <li key={u.id} className="py-2.5 flex items-center justify-between text-sm">
              <span>
                {u.nome} <span className="text-gray-400">· {u.email} · {ROLE_LABEL[u.role] ?? u.role}</span>
                {!u.senhaHash && <span className="badge bg-amber-50 text-amber-700 ml-2">Convite pendente</span>}
                {!u.ativo && <span className="badge bg-gray-100 text-gray-500 ml-2">Inativo</span>}
              </span>
              <span className="flex gap-3">
                {!u.senhaHash && (
                  <form action={reenviarConviteAction.bind(null, u.id, empresa.id)}>
                    <button type="submit" className="text-sm text-brand-700 hover:underline">Reenviar convite</button>
                  </form>
                )}
                <form action={toggleUsuarioAtivoAction.bind(null, u.id, u.ativo, empresa.id)}>
                  <button type="submit" className="text-sm text-gray-600 hover:underline">
                    {u.ativo ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>

        {empresa.status === "ATIVA" ? (
          <form action={criarUsuario} className="grid sm:grid-cols-4 gap-2 border-t pt-3">
            <input name="nome" placeholder="Nome" className="input" required />
            <input name="email" type="email" placeholder="E-mail" className="input" required />
            <select name="role" className="input">
              <option value="EMPRESA_ATENDENTE">Atendente</option>
              <option value="EMPRESA_ADMIN">Administrador do petshop</option>
            </select>
            <button type="submit" className="btn-primary">+ Criar acesso</button>
          </form>
        ) : (
          <p className="text-sm text-gray-500 border-t pt-3">
            Só é possível criar novos acessos depois que o banco desta empresa terminar de ser provisionado.
          </p>
        )}
      </div>
    </div>
  );
}
