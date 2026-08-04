"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

const configSchema = z.object({
  mercadoPagoAccessToken: z.string().optional(),
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
  });

  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      ...(data.mercadoPagoAccessToken ? { mercadoPagoAccessTokenEnc: encrypt(data.mercadoPagoAccessToken) } : {}),
    },
  });

  revalidatePath("/configuracoes");
}
