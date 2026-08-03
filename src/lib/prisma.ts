// ARQUIVO DESATIVADO: esta aplicação virou multi-tenant (um banco por
// petshop-cliente), então não existe mais "o" client fixo do Prisma.
//
// Use, em vez disso:
//   - `@/lib/control-prisma` (controlPrisma) para dados da plataforma
//     (empresas, usuários, convites).
//   - `@/lib/session-tenant` (getSessionTenantPrisma) dentro de
//     pages/Server Actions que mexem em dados operacionais do petshop
//     logado (clientes, animais, vendas, agenda, financeiro...).
//
// Este arquivo não deveria ter mais nenhum import — se o build reclamar de
// algum lugar ainda importando `@/lib/prisma`, é sinal de refatoração
// incompleta (ver README.md, seção "Arquitetura multi-tenant").
export {};
