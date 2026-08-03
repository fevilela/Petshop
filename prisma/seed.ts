import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Seed único: cria o usuário SUPER_ADMIN (você, dona da plataforma) e, para
 * facilitar o desenvolvimento local, uma empresa de demonstração com alguns
 * dados de exemplo (cliente, animal, canil, produto, serviço, plano).
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

  const superAdmin = await prisma.usuario.upsert({
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

  // ---------- Empresa de demonstração (dados de exemplo p/ dev local) ----------
  const empresa = await prisma.empresa.upsert({
    where: { id: "seed-empresa-demo" },
    update: {},
    create: {
      id: "seed-empresa-demo",
      nome: "Petshop Demo",
      emailResponsavel: "demo@petshop.local",
      status: "ATIVA",
    },
  });

  const cliente = await prisma.cliente.upsert({
    where: { id: "seed-cliente-1" },
    update: {},
    create: {
      id: "seed-cliente-1",
      empresaId: empresa.id,
      nome: "Maria Souza",
      telefone: "5511999998888",
      email: "maria@example.com",
      documento: "12345678900",
    },
  });

  const animal = await prisma.animal.upsert({
    where: { id: "seed-animal-1" },
    update: {},
    create: {
      id: "seed-animal-1",
      empresaId: empresa.id,
      nome: "Rex",
      clienteId: cliente.id,
      especie: "Cão",
      raca: "Vira-lata",
      porte: "MEDIO",
    },
  });

  await prisma.canil.upsert({
    where: { empresaId_identificador: { empresaId: empresa.id, identificador: "Canil 01" } },
    update: {},
    create: { empresaId: empresa.id, identificador: "Canil 01", capacidade: 1, tipoPorte: "MEDIO" },
  });

  const banho = await prisma.servico.upsert({
    where: { id: "seed-servico-banho" },
    update: {},
    create: {
      id: "seed-servico-banho",
      empresaId: empresa.id,
      nome: "Banho",
      categoria: "Estética",
      preco: 60,
      duracaoMinutos: 60,
    },
  });

  await prisma.produto.upsert({
    where: { id: "seed-produto-racao" },
    update: {},
    create: {
      id: "seed-produto-racao",
      empresaId: empresa.id,
      nome: "Ração Premium 10kg",
      categoria: "Alimentação",
      preco: 189.9,
      estoque: 20,
    },
  });

  const plano = await prisma.plano.upsert({
    where: { id: "seed-plano-banho-mensal" },
    update: {},
    create: {
      id: "seed-plano-banho-mensal",
      empresaId: empresa.id,
      nome: "Banho Mensal 4x",
      valorMensal: 200,
      diaCobrancaPadrao: 5,
      itens: { create: [{ empresaId: empresa.id, servicoId: banho.id, quantidade: 4 }] },
    },
  });

  await prisma.assinatura.upsert({
    where: { id: "seed-assinatura-1" },
    update: {},
    create: {
      id: "seed-assinatura-1",
      empresaId: empresa.id,
      clienteId: cliente.id,
      planoId: plano.id,
      valorMensal: plano.valorMensal,
      diaCobranca: plano.diaCobrancaPadrao,
    },
  });

  console.log("Seed concluído.");
  console.log(`Super admin: ${superAdmin.email} / senha: ${process.env.SUPER_ADMIN_SENHA ? "(a que você definiu)" : senha}`);
  console.log(`Empresa demo: ${empresa.nome} — cliente de exemplo: ${cliente.nome} (${animal.nome})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
