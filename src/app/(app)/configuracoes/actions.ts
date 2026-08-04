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

export type ConfiguracoesFormState = { error: string | null; sucesso: boolean };

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

/**
 * Assinatura compatível com `useFormState` (ver ConfiguracoesForm.tsx):
 * em vez de deixar uma falha inesperada (ex: ENCRYPTION_KEY ausente/
 * inválida no servidor) derrubar a página inteira com o "Application
 * error" genérico do Next, capturamos e devolvemos uma mensagem — o
 * formulário mostra isso inline, sem perder o que a pessoa já tinha
 * digitado. Erros de autorização (`exigirEmpresaAdmin`) não deveriam
 * acontecer via UI normal (o botão nem aparece pra quem não é admin), mas
 * mesmo assim viram mensagem em vez de crash, por segurança.
 */
export async function atualizarConfiguracoesAction(
  _prevState: ConfiguracoesFormState,
  formData: FormData
): Promise<ConfiguracoesFormState> {
  try {
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
    return { error: null, sucesso: true };
  } catch (err) {
    // Log completo só no servidor (ajuda a debugar ENCRYPTION_KEY ausente/
    // inválida, por ex.) — a pessoa recebe uma mensagem genérica, sem
    // detalhe de infraestrutura interna.
    console.error("[configuracoes] Falha ao salvar:", err);
    return {
      error: "Não foi possível salvar agora. Tente novamente em instantes ou contate o suporte se persistir.",
      sucesso: false,
    };
  }
}
