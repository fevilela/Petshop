"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { gerarFaturaMensal, referenciaMesAtual } from "@/lib/faturamento";
import { verificarPagamentoCobranca } from "@/lib/cobranca";

/** Gera (ou, se já existir, só abre) a fatura do mês corrente pra uma assinatura. */
export async function gerarFaturaAction(assinaturaId: string) {
  const { empresaId } = await getSessionTenantPrisma();
  const resultado = await gerarFaturaMensal(empresaId, assinaturaId, referenciaMesAtual());
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
