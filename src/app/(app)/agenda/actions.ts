"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";

const agendamentoSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente"),
  animalId: z.string().min(1, "Selecione o animal"),
  itemCatalogoId: z.string().optional(),
  canilId: z.string().optional(),
  dataHoraInicio: z.string().min(1, "Informe a data e hora"),
  dataHoraFim: z.string().optional(),
  observacoes: z.string().optional(),
});

export async function createAgendamento(formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = agendamentoSchema.parse({
    clienteId: formData.get("clienteId"),
    animalId: formData.get("animalId"),
    itemCatalogoId: formData.get("itemCatalogoId") || undefined,
    canilId: formData.get("canilId") || undefined,
    dataHoraInicio: formData.get("dataHoraInicio"),
    dataHoraFim: formData.get("dataHoraFim") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  });

  // Valida que cliente/animal/serviço/canil pertencem a esta empresa (banco
  // compartilhado — ver nota em vendas/actions.ts).
  await prisma.cliente.findUniqueOrThrow({ where: { id: data.clienteId } });
  await prisma.animal.findUniqueOrThrow({ where: { id: data.animalId } });
  if (data.itemCatalogoId) await prisma.itemCatalogo.findUniqueOrThrow({ where: { id: data.itemCatalogoId } });
  if (data.canilId) await prisma.canil.findUniqueOrThrow({ where: { id: data.canilId } });

  await prisma.agendamento.create({
    data: {
      empresaId,
      clienteId: data.clienteId,
      animalId: data.animalId,
      itemCatalogoId: data.itemCatalogoId,
      canilId: data.canilId,
      dataHoraInicio: new Date(data.dataHoraInicio),
      dataHoraFim: data.dataHoraFim ? new Date(data.dataHoraFim) : undefined,
      observacoes: data.observacoes,
    },
  });

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function atualizarStatusAgendamento(id: string, status: "CONFIRMADO" | "CONCLUIDO" | "CANCELADO") {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.agendamento.update({ where: { id }, data: { status } });
  revalidatePath("/agenda");
}
