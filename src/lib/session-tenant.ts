import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTenantPrisma } from "@/lib/tenant-prisma";

/**
 * Helper usado no topo de toda page/Server Action que mexe com dados
 * operacionais do petshop (clientes, animais, vendas...). Resolve a empresa
 * do usuário logado e devolve o Prisma Client já filtrado por essa empresa
 * (ver src/lib/tenant-prisma.ts).
 *
 * Um SUPER_ADMIN não tem empresaId (ele administra a plataforma, não opera
 * um petshop) — por isso essas rotas nunca devem ser chamadas por ele.
 */
export async function getSessionTenantPrisma() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!session.user.empresaId) {
    // SUPER_ADMIN caiu numa rota de tenant por engano.
    redirect("/admin");
  }

  const prisma = getTenantPrisma(session.user.empresaId);
  return { prisma, empresaId: session.user.empresaId, usuarioId: session.user.id };
}
