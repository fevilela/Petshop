-- Forma de cobrança padrão da assinatura (Pix/Boleto/Link de cartão),
-- usada tanto pela geração manual da fatura quanto pelo cron diário.
-- Default PIX preserva o comportamento atual pra toda assinatura já
-- existente (era hardcoded como Pix antes desta migração).
ALTER TABLE "Assinatura" ADD COLUMN "formaCobranca" "TipoCobranca" NOT NULL DEFAULT 'PIX';
