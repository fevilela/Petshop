"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { MODULOS, TODOS_MODULOS, type ModuloKey } from "@/lib/modulos";
import {
  criarEmpresaEIniciarProvisionamento,
  criarUsuarioEmpresaEConvidar,
  criarConviteEEnviarEmail,
} from "@/lib/tenant-provisioning";

/** Lê os checkboxes "modulo_<key>" do formData — não veio marcado = módulo desligado. */
function lerModulosDoForm(formData: FormData): ModuloKey[] {
  return MODULOS.map((m) => m.key).filter((key) => formData.get(`modulo_${key}`) === "on");
}

const empresaSchema = z.object({
  nomeEmpresa: z.string().min(2, "Informe o nome do petshop"),
  emailResponsavel: z.string().email("E-mail inválido"),
  nomeResponsavel: z.string().min(2, "Informe o nome do responsável"),
  tipoDocumento: z.enum(["CPF", "CNPJ"]).optional(),
  documento: z.string().optional(),
  mercadoPagoAccessToken: z.string().optional(),
});

export async function criarEmpresaAction(formData: FormData) {
  const data = empresaSchema.parse({
    nomeEmpresa: formData.get("nomeEmpresa"),
    emailResponsavel: formData.get("emailResponsavel"),
    nomeResponsavel: formData.get("nomeResponsavel"),
    tipoDocumento: formData.get("tipoDocumento") || undefined,
    documento: formData.get("documento") || undefined,
    mercadoPagoAccessToken: formData.get("mercadoPagoAccessToken") || undefined,
  });

  await criarEmpresaEIniciarProvisionamento({ ...data, modulosHabilitados: lerModulosDoForm(formData) });

  revalidatePath("/admin/empresas");
  redirect("/admin/empresas");
}

export async function atualizarModulosEmpresaAction(empresaId: string, formData: FormData) {
  const modulos = lerModulosDoForm(formData);
  await prisma.empresa.update({
    where: { id: empresaId },
    data: { modulosHabilitados: modulos.length > 0 ? modulos : TODOS_MODULOS },
  });
  revalidatePath(`/admin/empresas/${empresaId}`);
}

const credenciaisSchema = z.object({
  mercadoPagoAccessToken: z.string().optional(),
});

/** SUPER_ADMIN também pode configurar o Mercado Pago do petshop diretamente (além do próprio EMPRESA_ADMIN fazer isso em /configuracoes). */
export async function atualizarCredenciaisEmpresaAction(empresaId: string, formData: FormData) {
  const data = credenciaisSchema.parse({
    mercadoPagoAccessToken: formData.get("mercadoPagoAccessToken") || undefined,
  });
  if (data.mercadoPagoAccessToken) {
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { mercadoPagoAccessTokenEnc: encrypt(data.mercadoPagoAccessToken) },
    });
  }
  revalidatePath(`/admin/empresas/${empresaId}`);
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

  await criarUsuarioEmpresaEConvidar({ empresaId, ...data, modulosPermitidos: lerModulosDoForm(formData) });

  revalidatePath(`/admin/empresas/${empresaId}`);
}

export async function atualizarModulosUsuarioAction(usuarioId: string, empresaId: string, formData: FormData) {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { modulosPermitidos: lerModulosDoForm(formData) },
  });
  revalidatePath(`/admin/empresas/${empresaId}`);
}

export async function reenviarConviteAction(usuarioId: string, empresaId: string) {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  const empresa = empresaId ? await prisma.empresa.findUnique({ where: { id: empresaId } }) : null;

  await criarConviteEEnviarEmail(usuario.id, empresaId || null, empresa?.nome ?? "Petshop CRM", usuario.email);

  revalidatePath(`/admin/empresas/${empresaId}`);
}

export async function toggleUsuarioAtivoAction(usuarioId: string, ativo: boolean, empresaId: string) {
  await prisma.usuario.update({ where: { id: usuarioId }, data: { ativo: !ativo } });
  revalidatePath(`/admin/empresas/${empresaId}`);
}
