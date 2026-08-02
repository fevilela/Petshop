"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const agendamentoSchema = z.object({
  clienteId: z.string().min(1, "Selecione o cliente"),
  animalId: z.string().min(1, "Selecione o animal"),
  servicoId: z.string().optional(),
  canilId: z.string().optional(),
  dataHoraInicio: z.string().min(1, "Informe a data e hora"),
  dataHoraFim: z.string().optional(),
  observacoes: z.string().optional(),
});

export async function createAgendamento(formData: FormData) {
  const data = agendamentoSchema.parse({
    clienteId: formData.get("clienteId"),
    animalId: formData.get("animalId"),
    servicoId: formData.get("servicoId") || undefined,
    canilId: formData.get("canilId") || undefined,
    dataHoraInicio: formData.get("dataHoraInicio"),
    dataHoraFim: formData.get("dataHoraFim") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  });

  await prisma.agendamento.create({
    data: {
      clienteId: data.clienteId,
      animalId: data.animalId,
      servicoId: data.servicoId,
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
  await prisma.agendamento.update({ where: { id }, data: { status } });
  revalidatePath("/agenda");
}
