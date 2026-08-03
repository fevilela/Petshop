import { PrismaClient } from "@prisma/client";

// Cliente Prisma ÚNICO e compartilhado — todas as empresas (petshops-clientes)
// vivem no mesmo banco (DATABASE_URL), isoladas por empresaId. Nunca use este
// client diretamente numa rota que lida com dados de UMA empresa; use
// `getTenantPrisma(empresaId)` (src/lib/tenant-prisma.ts) ou, dentro de uma
// page/Server Action autenticada, `getSessionTenantPrisma()`
// (src/lib/session-tenant.ts) — eles devolvem uma versão deste client com o
// filtro por empresaId aplicado automaticamente em toda query.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
