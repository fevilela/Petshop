-- Remove a integração de WhatsApp via Cloud API (Meta): o envio de cobrança
-- por WhatsApp passou a ser feito só por link direto (wa.me), que não
-- depende de nenhuma credencial/tabela própria — ver README.

-- DropForeignKey (dropadas automaticamente junto com a tabela abaixo, listado
-- aqui só como documentação do que está sendo removido)
-- WhatsappMensagem_clienteId_fkey
-- WhatsappMensagem_cobrancaId_fkey

-- DropTable
DROP TABLE "WhatsappMensagem";

-- AlterTable
ALTER TABLE "Empresa"
  DROP COLUMN "whatsappPhoneNumberId",
  DROP COLUMN "whatsappBusinessAccountId",
  DROP COLUMN "whatsappAccessTokenEnc";

-- AlterTable
ALTER TABLE "Cobranca" DROP COLUMN "enviadoWhatsappEm";

-- DropEnum
DROP TYPE "StatusWhatsapp";
