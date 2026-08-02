"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const animalSchema = z.object({
  nome: z.string().min(1, "Informe o nome do animal"),
  clienteId: z.string().min(1, "Selecione o tutor"),
  especie: z.string().min(1, "Informe a espécie"),
  raca: z.string().optional(),
  porte: z.enum(["PEQUENO", "MEDIO", "GRANDE"]).optional(),
  dataNascimento: z.string().optional(),
  pesoKg: z.string().optional(),
  observacoes: z.string().optional(),
});

function parseForm(formData: FormData) {
  return animalSchema.parse({
    nome: formData.get("nome"),
    clienteId: formData.get("clienteId"),
    especie: formData.get("especie"),
    raca: formData.get("raca") || undefined,
    porte: formData.get("porte") || undefined,
    dataNascimento: formData.get("dataNascimento") || undefined,
    pesoKg: formData.get("pesoKg") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  });
}

export async function createAnimal(formData: FormData) {
  const data = parseForm(formData);

  await prisma.animal.create({
    data: {
      nome: data.nome,
      clienteId: data.clienteId,
      especie: data.especie,
      raca: data.raca,
      porte: data.porte,
      dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined,
      pesoKg: data.pesoKg ? Number(data.pesoKg) : undefined,
      observacoes: data.observacoes,
    },
  });

  revalidatePath("/animais");
  redirect("/animais");
}

export async function updateAnimal(id: string, formData: FormData) {
  const data = parseForm(formData);

  await prisma.animal.update({
    where: { id },
    data: {
      nome: data.nome,
      clienteId: data.clienteId,
      especie: data.especie,
      raca: data.raca,
      porte: data.porte,
      dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
      pesoKg: data.pesoKg ? Number(data.pesoKg) : null,
      observacoes: data.observacoes,
    },
  });

  revalidatePath("/animais");
  redirect("/animais");
}

export async function deleteAnimal(id: string) {
  await prisma.animal.update({ where: { id }, data: { ativo: false } });
  revalidatePath("/animais");
}
