"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const senhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual"),
    novaSenha: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres"),
    confirmarSenha: z.string(),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: "As senhas não conferem",
    path: ["confirmarSenha"],
  });

/**
 * Troca a senha do próprio usuário logado (SUPER_ADMIN ou qualquer usuário
 * de uma empresa). Usuario não é tenant-scoped (é o mesmo model pra
 * qualquer papel), por isso usamos o client compartilhado direto, filtrando
 * manualmente por session.user.id — nunca por um id vindo do formulário.
 */
export async function trocarMinhaSenhaAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const data = senhaSchema.parse({
    senhaAtual: formData.get("senhaAtual"),
    novaSenha: formData.get("novaSenha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!usuario.senhaHash) {
    throw new Error("Esta conta ainda não tem senha definida — use o link de convite recebido por e-mail.");
  }

  const senhaAtualValida = await bcrypt.compare(data.senhaAtual, usuario.senhaHash);
  if (!senhaAtualValida) {
    throw new Error("Senha atual incorreta.");
  }

  const novaSenhaHash = await bcrypt.hash(data.novaSenha, 10);
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash: novaSenhaHash },
  });

  redirect("/conta?trocada=1");
}
