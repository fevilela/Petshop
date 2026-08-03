import { PrismaClient } from "@/generated/tenant-client";
import { controlPrisma } from "@/lib/control-prisma";
import { decrypt } from "@/lib/crypto";

/**
 * Fábrica de PrismaClient por empresa (tenant). Cada petshop-cliente tem seu
 * próprio banco Postgres (Supabase), então não existe "o" client fixo como
 * em uma aplicação single-tenant — cada requisição precisa saber de qual
 * empresa é o usuário logado e pegar (ou criar) o client correspondente.
 *
 * Trade-off consciente: o cache abaixo mantém uma conexão viva por empresa
 * durante a vida do processo Node (ok para o Render, que roda um processo
 * persistente). Isso significa que, se as credenciais de uma empresa forem
 * trocadas manualmente no banco de controle, é preciso reiniciar o serviço
 * (ou chamar invalidateTenantPrisma) para o cache pegar o valor novo.
 */
const cache = new Map<string, PrismaClient>();

export async function getTenantPrisma(empresaId: string): Promise<PrismaClient> {
  const cached = cache.get(empresaId);
  if (cached) return cached;

  const empresa = await controlPrisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) {
    throw new Error(`Empresa ${empresaId} não encontrada no banco de controle.`);
  }
  if (empresa.status !== "ATIVA" || !empresa.databaseUrlEnc) {
    throw new Error(
      `Empresa ${empresa.nome} ainda não está com o banco pronto (status: ${empresa.status}).`
    );
  }

  const url = decrypt(empresa.databaseUrlEnc);
  const client = new PrismaClient({ datasources: { db: { url } } });
  cache.set(empresaId, client);
  return client;
}

/** Força a recriação do client na próxima chamada (ex: após trocar credenciais). */
export function invalidateTenantPrisma(empresaId: string) {
  cache.delete(empresaId);
}
