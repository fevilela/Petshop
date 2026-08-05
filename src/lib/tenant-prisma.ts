import { prisma } from "@/lib/prisma";

/**
 * Isolamento entre petshops-clientes num banco ÚNICO compartilhado: em vez de
 * um PrismaClient por empresa (conexão física separada), toda empresa usa o
 * MESMO client, só que "envolvido" por um Prisma Client Extension que injeta
 * `empresaId` automaticamente em toda query — quem chama nunca precisa (nem
 * consegue, por acidente) esquecer o filtro.
 *
 * Cobertura:
 *  - leitura/escrita "de topo" (findMany, findUnique, update, delete, count,
 *    upsert, etc.) em qualquer model tenant-scoped: `empresaId` é mesclado no
 *    `where` (ou em `create.data`/`create` no caso do upsert).
 *  - `create`/`createMany`: `empresaId` é mesclado nos dados.
 *
 * NÃO cobre (limitação conhecida do Prisma): escritas ANINHADAS dentro de um
 * único `create`/`update` (ex: `venda.create({ data: { itens: { create: [...] } } })`).
 * Os models afetados por isso (hoje só `ItemVenda`) foram desenhados de
 * propósito para nunca serem lidos/escritos fora dessa relação com o pai já
 * escopado — não precisam de `empresaId` próprio. Ver comentário no
 * prisma/schema.prisma. Para o único lugar onde usamos uma transação
 * interativa (`$transaction(async (tx) => ...)`, em vendas/actions.ts), o
 * `empresaId` é passado explicitamente também, como reforço — não confiamos
 * apenas na propagação do extension para dentro do client `tx`.
 */
const MODELOS_COM_EMPRESA_ID = new Set([
  "Cliente",
  "Animal",
  "Canil",
  "Hospedagem",
  "ItemCatalogo",
  "Assinatura",
  "Venda",
  "Cobranca",
  "ContaPagar",
  "ContaReceber",
  "Agendamento",
]);

const OPERACOES_COM_WHERE = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

/** Devolve o Prisma Client com o filtro de empresa aplicado automaticamente. */
export function getTenantPrisma(empresaId: string) {
  return prisma.$extends({
    name: `tenant-scope:${empresaId}`,
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!MODELOS_COM_EMPRESA_ID.has(model)) return query(args);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const a = args as any;

          if (OPERACOES_COM_WHERE.has(operation)) {
            a.where = { ...(a.where ?? {}), empresaId };
          } else if (operation === "create") {
            a.data = { ...(a.data ?? {}), empresaId };
          } else if (operation === "createMany" && Array.isArray(a.data)) {
            a.data = a.data.map((item: Record<string, unknown>) => ({ ...item, empresaId }));
          } else if (operation === "upsert") {
            a.where = { ...(a.where ?? {}), empresaId };
            a.create = { ...(a.create ?? {}), empresaId };
          }

          return query(a);
        },
      },
    },
  });
}

/**
 * Mantido por compatibilidade com quem chamava isso depois de atualizar
 * credenciais de uma empresa (ex: configuracoes/actions.ts). Não faz mais
 * nada: como não há mais um PrismaClient (nem cache de conexão) por empresa,
 * não existe estado para invalidar.
 */
export function invalidateTenantPrisma(_empresaId: string) {}
