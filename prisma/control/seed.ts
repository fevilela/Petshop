import { PrismaClient } from "../../src/generated/control-client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Cria o usuário SUPER_ADMIN inicial (você, dona da plataforma) — sem isso
 * não tem como logar em /admin pela primeira vez (é o "ovo e a galinha" de
 * todo sistema com convite: alguém precisa existir antes de poder convidar).
 *
 * Defina no seu .env antes de rodar (ou ajuste os valores default abaixo):
 *   SUPER_ADMIN_EMAIL
 *   SUPER_ADMIN_SENHA
 */
async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "fernandavsac@gmail.com";
  const senha = process.env.SUPER_ADMIN_SENHA || "troque-esta-senha-123";

  if (!process.env.SUPER_ADMIN_SENHA) {
    console.warn(
      "⚠ SUPER_ADMIN_SENHA não definida no .env — usando senha padrão insegura. Troque assim que logar."
    );
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nome: "Fernanda",
      email,
      senhaHash,
      role: "SUPER_ADMIN",
      empresaId: null,
    },
  });

  console.log("Seed do banco de controle concluído.");
  console.log(`Super admin: ${usuario.email} / senha: ${process.env.SUPER_ADMIN_SENHA ? "(a que você definiu)" : senha}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
