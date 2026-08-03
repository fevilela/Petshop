"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
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
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = parseForm(formData);

  // empresaId é passado explicitamente (mesmo o Client Extension já
  // injetando em runtime) porque o TIPO gerado pelo Prisma para `create`
  // exige o campo obrigatório do schema — a extension só relaxa isso em
  // runtime, não no tipo estático que o TypeScript checa no build.
  await prisma.cliente.create({
    data: { ...data, empresaId, telefone: normalizePhoneE164(data.telefone) },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateCliente(id: string, formData: FormData) {
  const { prisma } = await getSessionTenantPrisma();
  const data = parseForm(formData);

  await prisma.cliente.update({
    where: { id },
    data: { ...data, telefone: normalizePhoneE164(data.telefone) },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function deleteCliente(id: string) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
}
