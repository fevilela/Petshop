"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/utils";

const clienteSchema = z.object({
  nome: z.string().min(2, "Informe o nome completo"),
  telefone: z.string().min(8, "Informe um telefone/WhatsApp válido"),
  documento: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
});

function parseForm(formData: FormData) {
  return clienteSchema.parse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    documento: formData.get("documento") || undefined,
    email: formData.get("email") || undefined,
    endereco: formData.get("endereco") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  });
}

export async function createCliente(formData: FormData) {
  const data = parseForm(formData);

  await prisma.cliente.create({
    data: { ...data, telefone: normalizePhoneE164(data.telefone) },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateCliente(id: string, formData: FormData) {
  const data = parseForm(formData);

  await prisma.cliente.update({
    where: { id },
    data: { ...data, telefone: normalizePhoneE164(data.telefone) },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function deleteCliente(id: string) {
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
}
