-- AlterTable
-- Marca o clique em "Abrir no WhatsApp" (não é confirmação de entrega —
-- ver comentário no schema.prisma). Alimenta o lembrete de faturas mensais
-- geradas pelo cron que ainda não foram enviadas ao cliente.
ALTER TABLE "Cobranca" ADD COLUMN "notificadoClienteEm" TIMESTAMP(3);
