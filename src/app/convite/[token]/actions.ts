"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const senhaSchema = z
  .object({
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
    confirmarSenha: z.string(),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não conferem",
    path: ["confirmarSenha"],
  });

export async function definirSenhaAction(token: string, formData: FormData) {
  const data = senhaSchema.parse({
    senha: formData.get("senha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });

  const convite = await prisma.conviteUsuario.findUnique({ where: { token } });
  if (!convite || convite.usadoEm || convite.expiraEm < new Date()) {
    throw new Error("Este link de convite é inválido ou já expirou. Peça um novo.");
  }

  const senhaHash = await bcrypt.hash(data.senha, 10);

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: convite.usuarioId },
      data: { senhaHash, ativo: true },
    }),
    prisma.conviteUsuario.update({
      where: { id: convite.id },
      data: { usadoEm: new Date() },
    }),
  ]);

  redirect("/login?conviteAceito=1");
}
