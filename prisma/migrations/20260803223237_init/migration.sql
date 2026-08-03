-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CPF', 'CNPJ');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "modulosHabilitados" TEXT[] DEFAULT ARRAY['animais', 'canil', 'produtos_servicos', 'planos', 'agenda', 'vendas', 'financeiro']::TEXT[],
ADD COLUMN     "tipoDocumento" "TipoDocumento";

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "modulosPermitidos" TEXT[] DEFAULT ARRAY[]::TEXT[];
