import { PrismaClient } from "@/generated/control-client";

// Cliente do banco de CONTROLE (plataforma): empresas, usuários, convites.
// É um banco único e fixo (CONTROL_DATABASE_URL), diferente do banco de cada
// empresa (ver tenant-prisma.ts). Padrão singleton para evitar múltiplas
// instâncias em dev (hot reload do Next.js).
const globalForPrisma = globalThis as unknown as { controlPrisma?: PrismaClient };

export const controlPrisma =
  globalForPrisma.controlPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.controlPrisma = controlPrisma;
