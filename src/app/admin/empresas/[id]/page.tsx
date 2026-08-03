import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { MODULOS } from "@/lib/modulos";
import {
  criarUsuarioAction,
  reenviarConviteAction,
  toggleUsuarioAtivoAction,
  atualizarModulosEmpresaAction,
  atualizarCredenciaisEmpresaAction,
  atualizarModulosUsuarioAction,
} from "../actions";

const STATUS_BADGE: Record<string, string> = {
  ATIVA: "bg-green-50 text-green-700",
  SUSPENSA: "bg-gray-100 text-gray-500",
};

const ROLE_LABEL: Record<string, string> = {
  EMPRESA_ADMIN: "Administrador do petshop",
  EMPRESA_ATENDENTE: "Atendente",
};

function ModuloCheckboxes({
  modulosMarcados,
  idPrefix,
}: {
  modulosMarcados: string[];
  idPrefix: string;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {MODULOS.map((m) => (
        <label key={m.key} className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name={`modulo_${m.key}`}
            id={`${idPrefix}-${m.key}`}
            defaultChecked={modulosMarcados.includes(m.key)}
            className="rounded border-gray-300"
          />
          {m.label}
        </label>
      ))}
    </div>
  );
}

export default async function EmpresaDetalhePage({ params }: { params: { id: string } }) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: params.id },
    include: { usuarios: { orderBy: { createdAt: "asc" } } },
  });
  if (!empresa) notFound();

  const criarUsuario = criarUsuarioAction.bind(null, empresa.id);
  const atualizarModulosEmpresa = atualizarModulosEmpresaAction.bind(null, empresa.id);
  const atualizarCredenciais = atualizarCredenciaisEmpresaAction.bind(null, empresa.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{empresa.nome}</h1>
        <span className={`badge ${STATUS_BADGE[empresa.status]}`}>{empresa.status}</span>
      </div>

      <div className="card p-4 grid sm:grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">Responsável:</span> {empresa.emailResponsavel}</div>
        <div><span className="text-gray-500">{empresa.tipoDocumento ?? "Documento"}:</span> {empresa.documento ?? "—"}</div>
        <div><span className="text-gray-500">Criado em:</span> {formatDateTime(empresa.createdAt)}</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="font-medium text-gray-900 mb-1">Módulos habilitados</h2>
          <p className="text-xs text-gray-500 mb-3">
            O que este petshop, no geral, tem acesso. Usuários individuais podem ser restringidos
            a um subconjunto disto (veja abaixo, na lista de usuários).
          </p>
          <form action={atualizarModulosEmpresa} className="space-y-3">
            <ModuloCheckboxes modulosMarcados={empresa.modulosHabilitados} idPrefix="empresa" />
            <button type="submit" className="btn-secondary text-sm">Salvar módulos</button>
          </form>
        </div>

        <div className="card p-4">
          <h2 className="font-medium text-gray-900 mb-1">Mercado Pago</h2>
          <p className="text-xs text-gray-500 mb-3">
            {empresa.mercadoPagoAccessTokenEnc
              ? "Configurado — digite um novo token abaixo pra trocar."
              : "Ainda não configurado. O próprio responsável também pode preencher isso em Configurações."}
          </p>
          <form action={atualizarCredenciais} className="space-y-3">
            <input
              name="mercadoPagoAccessToken"
              className="input"
              placeholder={empresa.mercadoPagoAccessTokenEnc ? "•••••••• (digite para trocar)" : "APP_USR-..."}
            />
            <button type="submit" className="btn-secondary text-sm">Salvar token</button>
          </form>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-medium text-gray-900 mb-3">Usuários com acesso</h2>
        <ul className="divide-y divide-gray-100 mb-4">
          {empresa.usuarios.map((u) => (
            <li key={u.id} className="py-2.5 text-sm">
              <div className="flex items-center justify-between">
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
              </div>

              {u.role === "EMPRESA_ATENDENTE" && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:underline">
                    Restringir módulos deste usuário
                    {u.modulosPermitidos.length > 0 && (
                      <span className="text-brand-700"> (restrito hoje)</span>
                    )}
                  </summary>
                  <form
                    action={atualizarModulosUsuarioAction.bind(null, u.id, empresa.id)}
                    className="mt-2 pl-4 border-l border-gray-100 space-y-2"
                  >
                    <p className="text-xs text-gray-500">
                      Deixe tudo marcado (ou nada restrito) para este usuário ver o mesmo que a empresa habilitou.
                    </p>
                    <ModuloCheckboxes
                      modulosMarcados={u.modulosPermitidos.length > 0 ? u.modulosPermitidos : empresa.modulosHabilitados}
                      idPrefix={`user-${u.id}`}
                    />
                    <button type="submit" className="btn-secondary text-xs">Salvar restrição</button>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ul>

        {empresa.status === "ATIVA" ? (
          <form action={criarUsuario} className="space-y-3 border-t pt-3">
            <div className="grid sm:grid-cols-4 gap-2">
              <input name="nome" placeholder="Nome" className="input" required />
              <input name="email" type="email" placeholder="E-mail" className="input" required />
              <select name="role" className="input">
                <option value="EMPRESA_ATENDENTE">Atendente</option>
                <option value="EMPRESA_ADMIN">Administrador do petshop</option>
              </select>
              <button type="submit" className="btn-primary">+ Criar acesso</button>
            </div>
            <details>
              <summary className="text-xs text-gray-500 cursor-pointer hover:underline">
                Restringir módulos (só vale se for Atendente — Administrador sempre vê tudo)
              </summary>
              <div className="mt-2 pl-4 border-l border-gray-100">
                <ModuloCheckboxes modulosMarcados={empresa.modulosHabilitados} idPrefix="novo-usuario" />
              </div>
            </details>
          </form>
        ) : (
          <p className="text-sm text-gray-500 border-t pt-3">Este petshop está suspenso.</p>
        )}
      </div>
    </div>
  );
}
