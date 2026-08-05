"use server";

import { revalidatePath } from "next/cache";
import { getSessionTenantPrisma } from "@/lib/session-tenant";

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
