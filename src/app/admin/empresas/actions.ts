"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { controlPrisma } from "@/lib/control-prisma";
import {
  criarEmpresaEIniciarProvisionamento,
  criarUsuarioEmpresaEConvidar,
  criarConviteEEnviarEmail,
} from "@/lib/tenant-provisioning";

const empresaSchema = z.object({
  nomeEmpresa: z.string().min(2, "Informe o nome do petshop"),
  emailResponsavel: z.string().email("E-mail inválido"),
  nomeResponsavel: z.string().min(2, "Informe o nome do responsável"),
  documento: z.string().optional(),
});

export async function criarEmpresaAction(formData: FormData) {
  const data = empresaSchema.parse({
    nomeEmpresa: formData.get("nomeEmpresa"),
    emailResponsavel: formData.get("emailResponsavel"),
    nomeResponsavel: formData.get("nomeResponsavel"),
    documento: formData.get("documento") || undefined,
  });

  await criarEmpresaEIniciarProvisionamento(data);

  revalidatePath("/admin/empresas");
  redirect("/admin/empresas");
}

const usuarioSchema = z.object({
  nome: z.string().min(2, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(["EMPRESA_ADMIN", "EMPRESA_ATENDENTE"]),
});

export async function criarUsuarioAction(empresaId: string, formData: FormData) {
  const data = usuarioSchema.parse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  await criarUsuarioEmpresaEConvidar({ empresaId, ...data });

  revalidatePath(`/admin/empresas/${empresaId}`);
}

export async function reenviarConviteAction(usuarioId: string, empresaId: string) {
  const usuario = await controlPrisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  const empresa = empresaId ? await controlPrisma.empresa.findUnique({ where: { id: empresaId } }) : null;

  await criarConviteEEnviarEmail(usuario.id, empresaId || null, empresa?.nome ?? "Petshop CRM", usuario.email);

  revalidatePath(`/admin/empresas/${empresaId}`);
}

export async function toggleUsuarioAtivoAction(usuarioId: string, ativo: boolean, empresaId: string) {
  await controlPrisma.usuario.update({ where: { id: usuarioId }, data: { ativo: !ativo } });
  revalidatePath(`/admin/empresas/${empresaId}`);
}
