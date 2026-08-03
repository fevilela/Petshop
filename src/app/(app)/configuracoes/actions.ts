"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { controlPrisma } from "@/lib/control-prisma";
import { encrypt } from "@/lib/crypto";
import { invalidateTenantPrisma } from "@/lib/tenant-prisma";

const configSchema = z.object({
  mercadoPagoAccessToken: z.string().optional(),
  whatsappPhoneNumberId: z.string().optional(),
  whatsappBusinessAccountId: z.string().optional(),
  whatsappAccessToken: z.string().optional(),
});

/**
 * Só EMPRESA_ADMIN pode ver/editar credenciais — atendente não deveria ter
 * acesso ao token do Mercado Pago do petshop.
 */
async function exigirEmpresaAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.empresaId || session.user.role !== "EMPRESA_ADMIN") {
    throw new Error("Apenas o administrador do petshop pode alterar essas configurações.");
  }
  return session.user.empresaId;
}

export async function atualizarConfiguracoesAction(formData: FormData) {
  const empresaId = await exigirEmpresaAdmin();

  const data = configSchema.parse({
    mercadoPagoAccessToken: formData.get("mercadoPagoAccessToken") || undefined,
    whatsappPhoneNumberId: formData.get("whatsappPhoneNumberId") || undefined,
    whatsappBusinessAccountId: formData.get("whatsappBusinessAccountId") || undefined,
    whatsappAccessToken: formData.get("whatsappAccessToken") || undefined,
  });

  await controlPrisma.empresa.update({
    where: { id: empresaId },
    data: {
      ...(data.mercadoPagoAccessToken ? { mercadoPagoAccessTokenEnc: encrypt(data.mercadoPagoAccessToken) } : {}),
      ...(data.whatsappPhoneNumberId ? { whatsappPhoneNumberId: data.whatsappPhoneNumberId } : {}),
      ...(data.whatsappBusinessAccountId ? { whatsappBusinessAccountId: data.whatsappBusinessAccountId } : {}),
      ...(data.whatsappAccessToken ? { whatsappAccessTokenEnc: encrypt(data.whatsappAccessToken) } : {}),
    },
  });

  // Campos sensíveis não mudam qual banco a empresa usa, mas por segurança
  // simples invalidamos o cache mesmo assim (barato, evita estado velho).
  invalidateTenantPrisma(empresaId);
  revalidatePath("/configuracoes");
}
