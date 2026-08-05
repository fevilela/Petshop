"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { gerarFaturaMensal, referenciaMesAtual } from "@/lib/faturamento";
import { verificarPagamentoCobranca, marcarCobrancaNotificada } from "@/lib/cobranca";

/**
 * Gera (ou, se já existir, só abre) a fatura do mês corrente pra uma
 * assinatura. `formaCobranca` no form é opcional: se o atendente não trocar
 * o select (ver /planos/faturamento/page.tsx), usa a preferência salva na
 * própria assinatura — mesmo default que o cron usa.
 */
export async function gerarFaturaAction(assinaturaId: string, formData: FormData) {
  const { empresaId } = await getSessionTenantPrisma();
  const formaCobranca = formData.get("formaCobranca");
  const override = formaCobranca === "BOLETO" || formaCobranca === "PIX" || formaCobranca === "CARTAO_LINK" ? formaCobranca : undefined;

  const resultado = await gerarFaturaMensal(empresaId, assinaturaId, referenciaMesAtual(), override);
  revalidatePath("/planos/faturamento");
  if (resultado.cobrancaId) {
    redirect(`/planos/faturamento/${resultado.cobrancaId}`);
  }
}

export async function marcarFaturaPagaAction(cobrancaId: string) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.cobranca.update({
    where: { id: cobrancaId },
    data: { status: "PAGO", dataPagamento: new Date() },
  });
  revalidatePath("/planos/faturamento");
  revalidatePath(`/planos/faturamento/${cobrancaId}`);
}

export async function verificarPagamentoFaturaAction(cobrancaId: string) {
  const { empresaId } = await getSessionTenantPrisma();
  await verificarPagamentoCobranca(empresaId, cobrancaId);
  revalidatePath("/planos/faturamento");
  revalidatePath(`/planos/faturamento/${cobrancaId}`);
}

/** Marca que o atendente clicou em "Abrir no WhatsApp" pra esta fatura — ver src/lib/cobranca.ts. */
export async function marcarFaturaNotificadaAction(cobrancaId: string) {
  const { empresaId } = await getSessionTenantPrisma();
  await marcarCobrancaNotificada(empresaId, cobrancaId);
  revalidatePath("/planos/faturamento");
  revalidatePath(`/planos/faturamento/${cobrancaId}`);
}
