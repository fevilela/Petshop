import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const senhaHash = await bcrypt.hash("petshop123", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@petshop.local" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@petshop.local",
      senhaHash,
      role: "ADMIN",
    },
  });

  const cliente = await prisma.cliente.upsert({
    where: { id: "seed-cliente-1" },
    update: {},
    create: {
      id: "seed-cliente-1",
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
      nome: "Rex",
      clienteId: cliente.id,
      especie: "Cão",
      raca: "Vira-lata",
      porte: "MEDIO",
    },
  });

  await prisma.canil.upsert({
    where: { identificador: "Canil 01" },
    update: {},
    create: { identificador: "Canil 01", capacidade: 1, tipoPorte: "MEDIO" },
  });

  const banho = await prisma.servico.upsert({
    where: { id: "seed-servico-banho" },
    update: {},
    create: { id: "seed-servico-banho", nome: "Banho", categoria: "Estética", preco: 60, duracaoMinutos: 60 },
  });

  await prisma.produto.upsert({
    where: { id: "seed-produto-racao" },
    update: {},
    create: { id: "seed-produto-racao", nome: "Ração Premium 10kg", categoria: "Alimentação", preco: 189.9, estoque: 20 },
  });

  const plano = await prisma.plano.upsert({
    where: { id: "seed-plano-banho-mensal" },
    update: {},
    create: {
      id: "seed-plano-banho-mensal",
      nome: "Banho Mensal 4x",
      valorMensal: 200,
      diaCobrancaPadrao: 5,
      itens: { create: [{ servicoId: banho.id, quantidade: 4 }] },
    },
  });

  await prisma.assinatura.upsert({
    where: { id: "seed-assinatura-1" },
    update: {},
    create: {
      id: "seed-assinatura-1",
      clienteId: cliente.id,
      planoId: plano.id,
      valorMensal: plano.valorMensal,
      diaCobranca: plano.diaCobrancaPadrao,
    },
  });

  console.log("Seed concluído.");
  console.log(`Login: ${admin.email} / senha: petshop123`);
  console.log(`Cliente de exemplo: ${cliente.nome} (${animal.nome})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
