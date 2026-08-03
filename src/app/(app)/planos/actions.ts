"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";

const planoSchema = z.object({
  nome: z.string().min(1, "Informe o nome do plano"),
  descricao: z.string().optional(),
  valorMensal: z.string().min(1, "Informe o valor mensal"),
  diaCobrancaPadrao: z.string().optional(),
});

function parsePlano(formData: FormData) {
  return planoSchema.parse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao") || undefined,
    valorMensal: formData.get("valorMensal"),
    diaCobrancaPadrao: formData.get("diaCobrancaPadrao") || undefined,
  });
}

export async function createPlano(formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = parsePlano(formData);
  const plano = await prisma.plano.create({
    data: {
      empresaId,
      nome: data.nome,
      descricao: data.descricao,
      valorMensal: Number(data.valorMensal),
      diaCobrancaPadrao: data.diaCobrancaPadrao ? Number(data.diaCobrancaPadrao) : 5,
    },
  });
  revalidatePath("/planos");
  redirect(`/planos/${plano.id}`);
}

export async function updatePlano(id: string, formData: FormData) {
  const { prisma } = await getSessionTenantPrisma();
  const data = parsePlano(formData);
  await prisma.plano.update({
    where: { id },
    data: {
      nome: data.nome,
      descricao: data.descricao,
      valorMensal: Number(data.valorMensal),
      diaCobrancaPadrao: data.diaCobrancaPadrao ? Number(data.diaCobrancaPadrao) : 5,
    },
  });
  revalidatePath("/planos");
  redirect(`/planos/${id}`);
}

export async function togglePlanoAtivo(id: string, ativo: boolean) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.plano.update({ where: { id }, data: { ativo: !ativo } });
  revalidatePath("/planos");
}

const planoItemSchema = z.object({
  planoId: z.string().min(1),
  tipo: z.enum(["PRODUTO", "SERVICO"]),
  itemId: z.string().min(1, "Selecione um item"),
  quantidade: z.string().optional(),
});

export async function addPlanoItem(formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = planoItemSchema.parse({
    planoId: formData.get("planoId"),
    tipo: formData.get("tipo"),
    itemId: formData.get("itemId"),
    quantidade: formData.get("quantidade") || undefined,
  });

  // Valida planoId + produto/serviço contra o client escopado (banco
  // compartilhado — ver nota em vendas/actions.ts).
  await prisma.plano.findUniqueOrThrow({ where: { id: data.planoId } });
  if (data.tipo === "PRODUTO") {
    await prisma.produto.findUniqueOrThrow({ where: { id: data.itemId } });
  } else {
    await prisma.servico.findUniqueOrThrow({ where: { id: data.itemId } });
  }

  await prisma.planoItem.create({
    data: {
      empresaId,
      planoId: data.planoId,
      produtoId: data.tipo === "PRODUTO" ? data.itemId : undefined,
      servicoId: data.tipo === "SERVICO" ? data.itemId : undefined,
      quantidade: data.quantidade ? Number(data.quantidade) : 1,
    },
  });

  revalidatePath(`/planos/${data.planoId}`);
}

export async function removePlanoItem(planoId: string, itemId: string) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.planoItem.delete({ where: { id: itemId } });
  revalidatePath(`/planos/${planoId}`);
}

const assinaturaSchema = z.object({
  planoId: z.string().min(1),
  clienteId: z.string().min(1, "Selecione o cliente"),
  diaCobranca: z.string().optional(),
  valorMensal: z.string().optional(),
});

export async function createAssinatura(formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = assinaturaSchema.parse({
    planoId: formData.get("planoId"),
    clienteId: formData.get("clienteId"),
    diaCobranca: formData.get("diaCobranca") || undefined,
    valorMensal: formData.get("valorMensal") || undefined,
  });

  const plano = await prisma.plano.findUniqueOrThrow({ where: { id: data.planoId } });
  await prisma.cliente.findUniqueOrThrow({ where: { id: data.clienteId } });

  await prisma.assinatura.create({
    data: {
      empresaId,
      planoId: data.planoId,
      clienteId: data.clienteId,
      diaCobranca: data.diaCobranca ? Number(data.diaCobranca) : plano.diaCobrancaPadrao,
      valorMensal: data.valorMensal ? Number(data.valorMensal) : plano.valorMensal,
    },
  });

  revalidatePath(`/planos/${data.planoId}`);
}

export async function cancelarAssinatura(planoId: string, assinaturaId: string) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.assinatura.update({
    where: { id: assinaturaId },
    data: { status: "CANCELADA", dataFim: new Date() },
  });
  revalidatePath(`/planos/${planoId}`);
}
