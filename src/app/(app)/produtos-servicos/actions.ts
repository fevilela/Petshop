"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";

const produtoSchema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  categoria: z.string().optional(),
  descricao: z.string().optional(),
  preco: z.string().min(1, "Informe o preço"),
  estoque: z.string().optional(),
  sku: z.string().optional(),
});

function parseProduto(formData: FormData) {
  return produtoSchema.parse({
    nome: formData.get("nome"),
    categoria: formData.get("categoria") || undefined,
    descricao: formData.get("descricao") || undefined,
    preco: formData.get("preco"),
    estoque: formData.get("estoque") || undefined,
    sku: formData.get("sku") || undefined,
  });
}

export async function createProduto(formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = parseProduto(formData);
  await prisma.produto.create({
    data: { ...data, empresaId, preco: Number(data.preco), estoque: data.estoque ? Number(data.estoque) : 0, sku: data.sku || undefined },
  });
  revalidatePath("/produtos-servicos");
  redirect("/produtos-servicos");
}

export async function updateProduto(id: string, formData: FormData) {
  const { prisma } = await getSessionTenantPrisma();
  const data = parseProduto(formData);
  await prisma.produto.update({
    where: { id },
    data: { ...data, preco: Number(data.preco), estoque: data.estoque ? Number(data.estoque) : 0, sku: data.sku || undefined },
  });
  revalidatePath("/produtos-servicos");
  redirect("/produtos-servicos");
}

export async function toggleProdutoAtivo(id: string, ativo: boolean) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.produto.update({ where: { id }, data: { ativo: !ativo } });
  revalidatePath("/produtos-servicos");
}

const servicoSchema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  categoria: z.string().optional(),
  descricao: z.string().optional(),
  preco: z.string().min(1, "Informe o preço"),
  duracaoMinutos: z.string().optional(),
});

function parseServico(formData: FormData) {
  return servicoSchema.parse({
    nome: formData.get("nome"),
    categoria: formData.get("categoria") || undefined,
    descricao: formData.get("descricao") || undefined,
    preco: formData.get("preco"),
    duracaoMinutos: formData.get("duracaoMinutos") || undefined,
  });
}

export async function createServico(formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = parseServico(formData);
  await prisma.servico.create({
    data: { ...data, empresaId, preco: Number(data.preco), duracaoMinutos: data.duracaoMinutos ? Number(data.duracaoMinutos) : undefined },
  });
  revalidatePath("/produtos-servicos");
  redirect("/produtos-servicos");
}

export async function updateServico(id: string, formData: FormData) {
  const { prisma } = await getSessionTenantPrisma();
  const data = parseServico(formData);
  await prisma.servico.update({
    where: { id },
    data: { ...data, preco: Number(data.preco), duracaoMinutos: data.duracaoMinutos ? Number(data.duracaoMinutos) : undefined },
  });
  revalidatePath("/produtos-servicos");
  redirect("/produtos-servicos");
}

export async function toggleServicoAtivo(id: string, ativo: boolean) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.servico.update({ where: { id }, data: { ativo: !ativo } });
  revalidatePath("/produtos-servicos");
}
