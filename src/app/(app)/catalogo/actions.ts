"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";

/**
 * Catálogo único (produto/serviço/mensalidade — ver ItemCatalogo no
 * schema). Um Server Action por `tipo` em vez de um genérico só: os campos
 * relevantes mudam por tipo (estoque só produto, diaCobrancaPadrao só
 * mensalidade) e a validação de cada um é bem diferente — juntar tudo num
 * schema Zod só com opcionais everywhere perderia a garantia de "preço
 * obrigatório", etc. Os três escrevem na mesma tabela.
 */

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
  await prisma.itemCatalogo.create({
    data: {
      ...data,
      empresaId,
      tipo: "PRODUTO",
      preco: Number(data.preco),
      estoque: data.estoque ? Number(data.estoque) : 0,
      sku: data.sku || undefined,
    },
  });
  revalidatePath("/catalogo");
  redirect("/catalogo");
}

export async function updateProduto(id: string, formData: FormData) {
  const { prisma } = await getSessionTenantPrisma();
  const data = parseProduto(formData);
  await prisma.itemCatalogo.update({
    where: { id },
    data: { ...data, preco: Number(data.preco), estoque: data.estoque ? Number(data.estoque) : 0, sku: data.sku || undefined },
  });
  revalidatePath("/catalogo");
  redirect("/catalogo");
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
  await prisma.itemCatalogo.create({
    data: {
      ...data,
      empresaId,
      tipo: "SERVICO",
      preco: Number(data.preco),
      duracaoMinutos: data.duracaoMinutos ? Number(data.duracaoMinutos) : undefined,
    },
  });
  revalidatePath("/catalogo");
  redirect("/catalogo");
}

export async function updateServico(id: string, formData: FormData) {
  const { prisma } = await getSessionTenantPrisma();
  const data = parseServico(formData);
  await prisma.itemCatalogo.update({
    where: { id },
    data: { ...data, preco: Number(data.preco), duracaoMinutos: data.duracaoMinutos ? Number(data.duracaoMinutos) : undefined },
  });
  revalidatePath("/catalogo");
  redirect("/catalogo");
}

const mensalidadeSchema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  descricao: z.string().optional(),
  preco: z.string().min(1, "Informe o valor mensal"),
  diaCobrancaPadrao: z.string().optional(),
});

function parseMensalidade(formData: FormData) {
  return mensalidadeSchema.parse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao") || undefined,
    preco: formData.get("preco"),
    diaCobrancaPadrao: formData.get("diaCobrancaPadrao") || undefined,
  });
}

export async function createMensalidade(formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = parseMensalidade(formData);
  await prisma.itemCatalogo.create({
    data: {
      ...data,
      empresaId,
      tipo: "MENSALIDADE",
      preco: Number(data.preco),
      diaCobrancaPadrao: data.diaCobrancaPadrao ? Number(data.diaCobrancaPadrao) : 5,
    },
  });
  revalidatePath("/catalogo");
  redirect("/catalogo");
}

export async function updateMensalidade(id: string, formData: FormData) {
  const { prisma } = await getSessionTenantPrisma();
  const data = parseMensalidade(formData);
  await prisma.itemCatalogo.update({
    where: { id },
    data: {
      ...data,
      preco: Number(data.preco),
      diaCobrancaPadrao: data.diaCobrancaPadrao ? Number(data.diaCobrancaPadrao) : 5,
    },
  });
  revalidatePath("/catalogo");
  redirect("/catalogo");
}

/** Vale pros três tipos — só liga/desliga `ativo`, independe do tipo do item. */
export async function toggleItemCatalogoAtivo(id: string, ativo: boolean) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.itemCatalogo.update({ where: { id }, data: { ativo: !ativo } });
  revalidatePath("/catalogo");
}
