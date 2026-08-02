"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const canilSchema = z.object({
  identificador: z.string().min(1, "Informe um identificador (ex: Canil 01)"),
  tipoPorte: z.enum(["PEQUENO", "MEDIO", "GRANDE"]).optional(),
  capacidade: z.string().optional(),
  status: z.enum(["LIVRE", "OCUPADO", "MANUTENCAO"]),
  observacoes: z.string().optional(),
});

function parseForm(formData: FormData) {
  return canilSchema.parse({
    identificador: formData.get("identificador"),
    tipoPorte: formData.get("tipoPorte") || undefined,
    capacidade: formData.get("capacidade") || undefined,
    status: formData.get("status") || "LIVRE",
    observacoes: formData.get("observacoes") || undefined,
  });
}

export async function createCanil(formData: FormData) {
  const data = parseForm(formData);
  await prisma.canil.create({
    data: { ...data, capacidade: data.capacidade ? Number(data.capacidade) : 1 },
  });
  revalidatePath("/canil");
  redirect("/canil");
}

export async function updateCanil(id: string, formData: FormData) {
  const data = parseForm(formData);
  await prisma.canil.update({
    where: { id },
    data: { ...data, capacidade: data.capacidade ? Number(data.capacidade) : 1 },
  });
  revalidatePath("/canil");
  redirect("/canil");
}

export async function deleteCanil(id: string) {
  await prisma.canil.delete({ where: { id } });
  revalidatePath("/canil");
}

const hospedagemSchema = z.object({
  canilId: z.string().min(1),
  animalId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOutPrevisto: z.string().optional(),
  valorDiaria: z.string().optional(),
  observacoes: z.string().optional(),
});

export async function createHospedagem(formData: FormData) {
  const data = hospedagemSchema.parse({
    canilId: formData.get("canilId"),
    animalId: formData.get("animalId"),
    checkIn: formData.get("checkIn"),
    checkOutPrevisto: formData.get("checkOutPrevisto") || undefined,
    valorDiaria: formData.get("valorDiaria") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  });

  await prisma.$transaction([
    prisma.hospedagem.create({
      data: {
        canilId: data.canilId,
        animalId: data.animalId,
        checkIn: new Date(data.checkIn),
        checkOutPrevisto: data.checkOutPrevisto ? new Date(data.checkOutPrevisto) : undefined,
        valorDiaria: data.valorDiaria ? Number(data.valorDiaria) : undefined,
        observacoes: data.observacoes,
      },
    }),
    prisma.canil.update({ where: { id: data.canilId }, data: { status: "OCUPADO" } }),
  ]);

  revalidatePath("/canil");
  revalidatePath("/canil/hospedagens");
  redirect("/canil/hospedagens");
}

export async function finalizarHospedagem(hospedagemId: string, canilId: string) {
  await prisma.$transaction([
    prisma.hospedagem.update({ where: { id: hospedagemId }, data: { checkOut: new Date() } }),
    prisma.canil.update({ where: { id: canilId }, data: { status: "LIVRE" } }),
  ]);
  revalidatePath("/canil");
  revalidatePath("/canil/hospedagens");
}
