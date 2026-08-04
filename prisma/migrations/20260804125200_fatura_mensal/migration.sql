-- Fatura mensal consolidada (mensalidade + avulsos "A_FATURAR" do mensalista).
-- A cobrança consolidada reaproveita o model Cobranca (assinaturaId +
-- referenciaMes já existiam no schema, sem uso até agora).

-- AlterEnum
ALTER TYPE "FormaPagamento" ADD VALUE 'A_FATURAR';

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN "faturaCobrancaId" TEXT;

-- CreateIndex
CREATE INDEX "Venda_faturaCobrancaId_idx" ON "Venda"("faturaCobrancaId");

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_faturaCobrancaId_fkey"
  FOREIGN KEY ("faturaCobrancaId") REFERENCES "Cobranca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex (impede duas faturas consolidadas pra mesma assinatura no mesmo mês;
-- NULLs não colidem, então não afeta Cobranca de venda avulsa comum)
CREATE UNIQUE INDEX "Cobranca_assinaturaId_referenciaMes_key" ON "Cobranca"("assinaturaId", "referenciaMes");
