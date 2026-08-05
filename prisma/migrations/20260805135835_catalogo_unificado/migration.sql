-- Unifica Produto + Servico + Plano num catálogo único (ItemCatalogo,
-- diferenciado por `tipo`), e remove PlanoItem (itens "inclusos grátis" no
-- plano — conceito removido, ver prisma/schema.prisma pro histórico da
-- decisão). Preserva o `id` original de cada Produto/Servico/Plano ao
-- migrar pra ItemCatalogo — os três já usavam cuid() como gerador, então a
-- chance de colisão entre eles é desprezível, e preservar o id evita ter
-- que remapear toda FK que apontava pra essas tabelas (ItemVenda,
-- Assinatura, Agendamento só precisam trocar de coluna/tabela referenciada,
-- não de valor).

-- CreateEnum
CREATE TYPE "TipoItemCatalogo" AS ENUM ('PRODUTO', 'SERVICO', 'MENSALIDADE');

-- CreateTable
CREATE TABLE "ItemCatalogo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" "TipoItemCatalogo" NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "estoque" INTEGER,
    "sku" TEXT,
    "duracaoMinutos" INTEGER,
    "diaCobrancaPadrao" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemCatalogo_empresaId_idx" ON "ItemCatalogo"("empresaId");

-- CreateIndex
CREATE INDEX "ItemCatalogo_empresaId_tipo_idx" ON "ItemCatalogo"("empresaId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCatalogo_empresaId_sku_key" ON "ItemCatalogo"("empresaId", "sku");

-- Migra os dados (mantendo o id original de cada linha)
INSERT INTO "ItemCatalogo" ("id", "empresaId", "tipo", "nome", "categoria", "descricao", "preco", "estoque", "sku", "ativo", "createdAt")
SELECT "id", "empresaId", 'PRODUTO', "nome", "categoria", "descricao", "preco", "estoque", "sku", "ativo", "createdAt"
FROM "Produto";

INSERT INTO "ItemCatalogo" ("id", "empresaId", "tipo", "nome", "categoria", "descricao", "preco", "duracaoMinutos", "ativo", "createdAt")
SELECT "id", "empresaId", 'SERVICO', "nome", "categoria", "descricao", "preco", "duracaoMinutos", "ativo", "createdAt"
FROM "Servico";

INSERT INTO "ItemCatalogo" ("id", "empresaId", "tipo", "nome", "descricao", "preco", "diaCobrancaPadrao", "ativo", "createdAt")
SELECT "id", "empresaId", 'MENSALIDADE', "nome", "descricao", "valorMensal", "diaCobrancaPadrao", "ativo", "createdAt"
FROM "Plano";

-- ItemVenda: consolida produtoId/servicoId (nunca os dois ao mesmo tempo,
-- por isso o COALESCE é seguro) num único itemCatalogoId obrigatório.
ALTER TABLE "ItemVenda" DROP CONSTRAINT "ItemVenda_produtoId_fkey";
ALTER TABLE "ItemVenda" DROP CONSTRAINT "ItemVenda_servicoId_fkey";

ALTER TABLE "ItemVenda" ADD COLUMN "itemCatalogoId" TEXT;
UPDATE "ItemVenda" SET "itemCatalogoId" = COALESCE("produtoId", "servicoId");
ALTER TABLE "ItemVenda" ALTER COLUMN "itemCatalogoId" SET NOT NULL;

ALTER TABLE "ItemVenda" DROP COLUMN "produtoId";
ALTER TABLE "ItemVenda" DROP COLUMN "servicoId";
ALTER TABLE "ItemVenda" DROP COLUMN "tipo";

-- CreateIndex
CREATE INDEX "ItemVenda_itemCatalogoId_idx" ON "ItemVenda"("itemCatalogoId");

-- AddForeignKey (RESTRICT, não SET NULL: coluna agora é obrigatória —
-- nunca dá pra apagar um item do catálogo que já foi vendido algum dia)
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_itemCatalogoId_fkey" FOREIGN KEY ("itemCatalogoId") REFERENCES "ItemCatalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Assinatura: planoId -> itemCatalogoId (mesmos valores: Plano.id virou
-- ItemCatalogo.id na migração de dados acima)
ALTER TABLE "Assinatura" DROP CONSTRAINT "Assinatura_planoId_fkey";
ALTER TABLE "Assinatura" RENAME COLUMN "planoId" TO "itemCatalogoId";
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_itemCatalogoId_fkey" FOREIGN KEY ("itemCatalogoId") REFERENCES "ItemCatalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Agendamento: servicoId -> itemCatalogoId (mesma lógica; continua nullable)
ALTER TABLE "Agendamento" DROP CONSTRAINT "Agendamento_servicoId_fkey";
ALTER TABLE "Agendamento" RENAME COLUMN "servicoId" TO "itemCatalogoId";
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_itemCatalogoId_fkey" FOREIGN KEY ("itemCatalogoId") REFERENCES "ItemCatalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove o conceito de "itens inclusos grátis no plano"
DROP TABLE "PlanoItem";

-- Tabelas antigas, já totalmente substituídas por ItemCatalogo
DROP TABLE "Produto";
DROP TABLE "Servico";
DROP TABLE "Plano";

-- Não usado mais: ItemVenda perdeu a coluna "tipo" (agora vem de ItemCatalogo.tipo)
DROP TYPE "TipoItemVenda";
