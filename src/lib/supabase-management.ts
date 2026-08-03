/**
 * Integração com a Management API da Supabase, para criar um projeto
 * (banco Postgres) novo automaticamente para cada petshop-cliente.
 *
 * Requer no .env:
 *   SUPABASE_ACCESS_TOKEN      — Personal Access Token (Supabase > Account > Access Tokens).
 *                                PODER AMPLO: cria/apaga qualquer projeto da organização.
 *   SUPABASE_ORGANIZATION_SLUG — slug da sua organização (aparece na URL do dashboard).
 *
 * Documentação: https://supabase.com/docs/guides/integrations/supabase-for-platforms
 *
 * ATENÇÃO: não temos como testar esta integração sem um token real da sua
 * conta Supabase. O formato do payload e os nomes dos campos foram
 * confirmados na documentação oficial, mas vale testar o primeiro
 * provisionamento com atenção e me mandar qualquer erro de resposta da API
 * para eu ajustar rapidamente (mesmo padrão que usamos no deploy do Render).
 */

const SUPABASE_API_URL = "https://api.supabase.com/v1";

function getAccessToken(): string {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN não configurado. Gere em supabase.com/dashboard/account/tokens."
    );
  }
  return token;
}

function getOrganizationSlug(): string {
  const slug = process.env.SUPABASE_ORGANIZATION_SLUG;
  if (!slug) {
    throw new Error("SUPABASE_ORGANIZATION_SLUG não configurado no .env.");
  }
  return slug;
}

type ProjetoSupabase = {
  id: string; // project ref, ex: "ombhhitehtlryylmvepb"
  name: string;
  region: string; // ex: "sa-east-1"
  status: string;
};

/** Cria um novo projeto (banco) na Supabase para uma empresa. */
export async function criarProjetoSupabase(nomeEmpresa: string, dbPass: string): Promise<ProjetoSupabase> {
  const res = await fetch(`${SUPABASE_API_URL}/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `petshop-${nomeEmpresa}`.slice(0, 63),
      organization_id: getOrganizationSlug(),
      db_pass: dbPass,
      region_selection: {
        type: "smartGroup",
        code: process.env.SUPABASE_REGION_GROUP || "americas",
      },
      plan: "free",
      // Não passamos `desired_instance_size`: deixando de fora habilita o
      // instance size Nano (scale-to-zero), o mais barato disponível.
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar projeto na Supabase: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

/** Consulta o status atual de um projeto (para saber se já está pronto para uso). */
export async function consultarProjetoSupabase(projectRef: string): Promise<ProjetoSupabase> {
  const res = await fetch(`${SUPABASE_API_URL}/projects/${projectRef}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao consultar projeto ${projectRef}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Espera o projeto ficar pronto (status ACTIVE_HEALTHY), consultando
 * periodicamente. Provisionar um projeto novo costuma levar de 1 a 3 minutos.
 */
export async function aguardarProjetoPronto(
  projectRef: string,
  { timeoutMs = 5 * 60 * 1000, intervalMs = 5000 } = {}
): Promise<void> {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const projeto = await consultarProjetoSupabase(projectRef);
    if (projeto.status === "ACTIVE_HEALTHY") return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Tempo esgotado esperando o projeto ${projectRef} ficar pronto.`);
}

/**
 * Monta as connection strings do projeto a partir do ref + região retornados
 * pela API. Usamos o pooler (Supavisor, IPv4) para a `DATABASE_URL` de
 * runtime — conexão direta na porta 5432 é IPv6-only desde 2024 e não
 * funciona a partir do Render (mesmo problema que já resolvemos antes).
 *
 * SUPOSIÇÃO A VALIDAR: o host do pooler segue o padrão "aws-0-<region>";
 * se a Supabase retornar um prefixo diferente (aws-1-, etc.) para algum
 * projeto, essa string vai precisar ser ajustada — o provisionamento vai
 * falhar de forma visível (status ERRO_PROVISIONAMENTO) em vez de silenciosa,
 * então dá para corrigir rápido se acontecer.
 */
export function montarConnectionStrings(
  projectRef: string,
  region: string,
  dbPass: string
): { direta: string; pooler: string } {
  const senhaCodificada = encodeURIComponent(dbPass);
  const direta = `postgresql://postgres:${senhaCodificada}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
  const pooler = `postgresql://postgres.${projectRef}:${senhaCodificada}@aws-0-${region}.pooler.supabase.com:5432/postgres?sslmode=require`;
  return { direta, pooler };
}
