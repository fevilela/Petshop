"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";

const contaSchema = z.object({
  descricao: z.string().min(1, "Informe a descrição"),
  clienteId: z.string().optional(),
  valor: z.string().min(1, "Informe o valor"),
  dataVencimento: z.string().min(1, "Informe o vencimento"),
  observacoes: z.string().optional(),
});

function parseForm(formData: FormData) {
  return contaSchema.parse({
    descricao: formData.get("descricao"),
    clienteId: formData.get("clienteId") || undefined,
    valor: formData.get("valor"),
    dataVencimento: formData.get("dataVencimento"),
    observacoes: formData.get("observacoes") || undefined,
  });
}

export async function createContaReceber(formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = parseForm(formData);
  if (data.clienteId) await prisma.cliente.findUniqueOrThrow({ where: { id: data.clienteId } });
  await prisma.contaReceber.create({
    data: { ...data, empresaId, valor: Number(data.valor), dataVencimento: new Date(data.dataVencimento) },
  });
  revalidatePath("/financeiro/contas-a-receber");
  redirect("/financeiro/contas-a-receber");
}

export async function updateContaReceber(id: string, formData: FormData) {
  const { prisma } = await getSessionTenantPrisma();
  const data = parseForm(formData);
  if (data.clienteId) await prisma.cliente.findUniqueOrThrow({ where: { id: data.clienteId } });
  await prisma.contaReceber.update({
    where: { id },
    data: { ...data, valor: Number(data.valor), dataVencimento: new Date(data.dataVencimento) },
  });
  revalidatePath("/financeiro/contas-a-receber");
  redirect("/financeiro/contas-a-receber");
}

export async function marcarContaReceberRecebida(id: string) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.contaReceber.update({ where: { id }, data: { status: "PAGO", dataRecebimento: new Date() } });
  revalidatePath("/financeiro/contas-a-receber");
}

export async function deleteContaReceber(id: string) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.contaReceber.delete({ where: { id } });
  revalidatePath("/financeiro/contas-a-receber");
}
