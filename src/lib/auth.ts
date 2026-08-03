import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) return null;

        // Usuario não é tenant-scoped (não tem empresaId obrigatório: o
        // SUPER_ADMIN não pertence a nenhuma empresa), por isso usamos o
        // client compartilhado direto em vez do client escopado por tenant.
        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!usuario || !usuario.ativo || !usuario.senhaHash) return null;

        const senhaValida = await bcrypt.compare(credentials.senha, usuario.senhaHash);
        if (!senhaValida) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          empresaId: usuario.empresaId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.empresaId = user.empresaId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.empresaId = token.empresaId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
