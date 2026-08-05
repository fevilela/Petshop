-- Endereço estruturado do cliente, separado do campo livre "endereco" já
-- existente — exigido pela API de boleto do Mercado Pago (zip_code/
-- street_name/street_number/neighborhood/city/federal_unit). Todas as
-- colunas nullable: opcional no cadastro geral, só passa a ser exigido em
-- código (não em banco) quando o atendente escolhe Boleto.
ALTER TABLE "Cliente" ADD COLUMN "cep" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "logradouro" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "numero" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "complemento" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "bairro" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "cidade" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "uf" TEXT;
