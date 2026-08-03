"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";

const contaSchema = z.object({
  descricao: z.string().min(1, "Informe a descrição"),
  fornecedor: z.string().optional(),
  categoria: z.string().optional(),
  valor: z.string().min(1, "Informe o valor"),
  dataVencimento: z.string().min(1, "Informe o vencimento"),
  observacoes: z.string().optional(),
});

function parseForm(formData: FormData) {
  return contaSchema.parse({
    descricao: formData.get("descricao"),
    fornecedor: formData.get("fornecedor") || undefined,
    categoria: formData.get("categoria") || undefined,
    valor: formData.get("valor"),
    dataVencimento: formData.get("dataVencimento"),
    observacoes: formData.get("observacoes") || undefined,
  });
}

export async function createContaPagar(formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = parseForm(formData);
  await prisma.contaPagar.create({
    data: { ...data, empresaId, valor: Number(data.valor), dataVencimento: new Date(data.dataVencimento) },
  });
  revalidatePath("/financeiro/contas-a-pagar");
  redirect("/financeiro/contas-a-pagar");
}

export async function updateContaPagar(id: string, formData: FormData) {
  const { prisma } = await getSessionTenantPrisma();
  const data = parseForm(formData);
  await prisma.contaPagar.update({
    where: { id },
    data: { ...data, valor: Number(data.valor), dataVencimento: new Date(data.dataVencimento) },
  });
  revalidatePath("/financeiro/contas-a-pagar");
  redirect("/financeiro/contas-a-pagar");
}

export async function marcarContaPagarPaga(id: string) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.contaPagar.update({ where: { id }, data: { status: "PAGO", dataPagamento: new Date() } });
  revalidatePath("/financeiro/contas-a-pagar");
}

export async function deleteContaPagar(id: string) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.contaPagar.delete({ where: { id } });
  revalidatePath("/financeiro/contas-a-pagar");
}
