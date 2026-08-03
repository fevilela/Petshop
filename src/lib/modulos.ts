import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RoleUsuario } from "@prisma/client";

/**
 * Lista canônica de módulos que podem ser ligados/desligados por empresa e
 * por usuário. "Clientes" (e o Painel) não entram aqui de propósito: são a
 * base de tudo (quase todo outro módulo depende de Cliente existir) e ficam
 * sempre visíveis para qualquer usuário de uma empresa ativa.
 */
export const MODULOS = [
  { key: "animais", label: "Animais" },
  { key: "canil", label: "Canil / Hospedagem" },
  { key: "produtos_servicos", label: "Produtos & Serviços" },
  { key: "planos", label: "Planos (Mensalistas)" },
  { key: "agenda", label: "Agenda" },
  { key: "vendas", label: "Vendas" },
  { key: "financeiro", label: "Financeiro" },
] as const;

export type ModuloKey = (typeof MODULOS)[number]["key"];

export const TODOS_MODULOS: ModuloKey[] = MODULOS.map((m) => m.key);

/**
 * Calcula o conjunto efetivo de módulos que um usuário pode ver: nunca passa
 * do que a empresa habilitou, e — só para EMPRESA_ATENDENTE — pode ser
 * restrito a um subconjunto próprio (`modulosPermitidos`). Lista vazia em
 * `modulosPermitidos` significa "sem restrição extra" (herda tudo da
 * empresa), não "acesso a nada" — um atendente recém-criado não deveria
 * ficar sem acesso a nada por padrão.
 */
export function modulosEfetivos(
  usuario: { role: RoleUsuario; modulosPermitidos: string[] },
  empresaModulos: string[]
): string[] {
  if (usuario.role !== "EMPRESA_ATENDENTE") return empresaModulos;
  if (usuario.modulosPermitidos.length === 0) return empresaModulos;
  return empresaModulos.filter((m) => usuario.modulosPermitidos.includes(m));
}

/**
 * Busca sessão + Usuario + Empresa e devolve o conjunto efetivo de módulos
 * do usuário logado. Usado no layout raiz (para a Sidebar) e nos layouts de
 * cada módulo (para bloquear acesso direto por URL). Faz uma consulta extra
 * ao banco (Usuario + Empresa) — aceitável: só roda ao renderizar layouts,
 * não a cada Server Action.
 */
export async function getModulosEfetivosSessao(): Promise<ModuloKey[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.empresaId) return [];

  const [usuario, empresa] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: session.user.id } }),
    prisma.empresa.findUnique({ where: { id: session.user.empresaId } }),
  ]);
  if (!usuario || !empresa) return [];

  return modulosEfetivos(usuario, empresa.modulosHabilitados) as ModuloKey[];
}

/**
 * Guarda de página: usada no topo do layout.tsx de cada módulo. Redireciona
 * para o painel se o usuário logado não tiver acesso a esse módulo — seja
 * porque a empresa desligou, seja porque o atendente foi restringido.
 */
export async function requireModulo(modulo: ModuloKey) {
  const efetivos = await getModulosEfetivosSessao();
  if (!efetivos.includes(modulo)) {
    redirect("/?semAcesso=1");
  }
}
