"use server";

import { revalidatePath } from "next/cache";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { validarClienteParaBoleto } from "@/lib/cliente-validacoes";

// Criar/editar mensalidade, gerenciar "itens inclusos" (PlanoItem) e
// "assinar cliente a um plano" foram removidos daqui — ver:
//  - /catalogo/actions.ts (createMensalidade/updateMensalidade/toggleItemCatalogoAtivo)
//  - src/lib/assinatura.ts (criarAssinatura — chamada do cadastro do cliente ou do carrinho de Vendas)
// PlanoItem ("itens inclusos grátis no plano") deixou de existir — ver
// prisma/schema.prisma pro histórico da decisão.

/** Cancela a assinatura de um cliente — chamado a partir de /planos/[id] (detalhe da mensalidade) e do cadastro do cliente. */
export async function cancelarAssinatura(assinaturaId: string) {
  const { prisma } = await getSessionTenantPrisma();
  const assinatura = await prisma.assinatura.update({
    where: { id: assinaturaId },
    data: { status: "CANCELADA", dataFim: new Date() },
  });
  revalidatePath(`/planos/${assinatura.itemCatalogoId}`);
  revalidatePath(`/clientes/${assinatura.clienteId}`);
  revalidatePath(`/clientes/${assinatura.clienteId}/editar`);
}

/**
 * Troca a forma de cobrança PADRÃO de uma assinatura já existente (ver
 * comentário em Assinatura.formaCobranca no schema) — chamado a partir do
 * cadastro do cliente. Diferente do override feito ao gerar uma fatura
 * específica em /planos/faturamento (aquele vale só pra um mês, este muda o
 * que o cron vai usar dali em diante).
 */
export async function atualizarFormaCobranca(assinaturaId: string, formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const formaCobranca = formData.get("formaCobranca");
  if (formaCobranca !== "BOLETO" && formaCobranca !== "PIX" && formaCobranca !== "CARTAO_LINK") {
    throw new Error("Forma de cobrança inválida.");
  }

  const assinatura = await prisma.assinatura.findFirstOrThrow({
    where: { id: assinaturaId, empresaId },
    include: { cliente: true },
  });

  if (formaCobranca === "BOLETO") {
    const erro = validarClienteParaBoleto(assinatura.cliente);
    if (erro) throw new Error(erro);
  }

  await prisma.assinatura.update({ where: { id: assinaturaId }, data: { formaCobranca } });
  revalidatePath(`/planos/${assinatura.itemCatalogoId}`);
  revalidatePath(`/clientes/${assinatura.clienteId}`);
  revalidatePath(`/clientes/${assinatura.clienteId}/editar`);
}
