# Petshop CRM

CRM interno para petshop + hotelzinho: cadastros de clientes, animais, canil,
produtos e serviços, agenda, vendas (avulsas e mensalistas), financeiro
(contas a pagar/receber) e cobrança via Mercado Pago com envio automático
pelo WhatsApp.

Este é o **MVP da Fase 1** (cadastros, agenda, vendas manuais, financeiro
manual). A Fase 2 (cobrança automática via Mercado Pago + envio automático
por WhatsApp) já está com a estrutura pronta no código, faltando apenas
credenciais reais — ver [Fase 2](#fase-2--pagamentos-e-whatsapp-automáticos).

## Stack e por quê

- **Next.js 14 (App Router) + TypeScript** — um único deploy (frontend +
  backend via Server Actions/Route Handlers), produtivo para telas de CRUD e
  dashboards, sem precisar manter uma API separada.
- **Prisma + PostgreSQL** — schema tipado, migrations versionadas, e
  PostgreSQL é o banco recomendado por qualquer provedor gerenciado
  (Neon, Supabase, Railway).
- **NextAuth (Credentials + JWT)** — login simples de e-mail/senha para a
  equipe do petshop. Trocar por outro provider (Google, etc.) no futuro é
  incremental.
- **Server Actions em vez de API REST própria** — menos boilerplate para
  formulários de CRUD; toda mutação já roda no servidor com validação Zod.
- **Zero SDKs pesados para integrações externas** — `lib/mercadopago.ts` e
  `lib/whatsapp.ts` usam `fetch` direto contra as APIs REST da Mercado Pago e
  da Meta. Trade-off: perdemos tipagem forte de um SDK oficial, ganhamos
  menos dependências e comportamento 100% previsível.

## Modelo de dados (resumo)

`Cliente` → `Animal` (1:N) · `Canil` ↔ `Hospedagem` ↔ `Animal` ·
`Produto` / `Servico` (catálogo) · `Plano` (template mensal) → `PlanoItem`
(o que está incluso) · `Assinatura` (cliente + plano = "mensalista") ·
`Venda` → `ItemVenda` (pode debitar de uma `Assinatura` em vez de gerar
cobrança) · `Cobranca` (boleto/Pix/link, ligada a uma `Venda` ou a uma
mensalidade) · `ContaPagar` / `ContaReceber` · `Agendamento` ·
`WhatsappMensagem` (log de envios).

**Como funciona "alguns clientes são mensalistas, outros não":** não existe
um campo booleano fixo no `Cliente`. Um cliente vira mensalista ao ganhar
uma `Assinatura` ativa a um `Plano`. Na tela de Vendas, ao escolher a forma
de pagamento "Mensalista", a venda é debitada da assinatura (sem gerar
cobrança nova); qualquer outra forma de pagamento segue o fluxo avulso
normal. Isso permite o mesmo cliente ter produtos avulsos E um plano mensal
ao mesmo tempo.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL e NEXTAUTH_SECRET no mínimo
npx prisma migrate dev --name init
npm run seed            # cria usuário admin@petshop.local / senha petshop123
npm run dev
```

Banco de dados: qualquer Postgres serve. Para começar rápido, crie um banco
gratuito em [neon.tech](https://neon.tech) ou [supabase.com](https://supabase.com)
e cole a connection string em `DATABASE_URL`.

`NEXTAUTH_SECRET`: gere com `openssl rand -base64 32`.

## Deploy (Vercel + banco gerenciado)

1. Suba o projeto num repositório Git e importe na Vercel.
2. Configure as variáveis de ambiente do `.env.example` no painel da Vercel.
3. Rode `npx prisma migrate deploy` (via CI ou manualmente) contra o banco de
   produção antes do primeiro deploy.
4. Aponte `NEXTAUTH_URL` e `APP_URL` para o domínio final.

## Fase 2 — pagamentos e WhatsApp automáticos

O código já está preparado, faltam credenciais:

**Mercado Pago** (`lib/mercadopago.ts`)
1. Crie uma aplicação em [mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel).
2. Copie o Access Token de produção para `MERCADOPAGO_ACCESS_TOKEN`.
3. Configure a URL de notificações (`https://seu-dominio/api/webhooks/mercadopago`)
   no painel de Webhooks — é isso que atualiza `Cobranca.status` para `PAGO`
   automaticamente.
4. A partir daí, toda venda com forma de pagamento "Pix (Mercado Pago)",
   "Boleto" ou "Link de pagamento" já vai gerar a cobrança de verdade.

**WhatsApp Cloud API** (`lib/whatsapp.ts`)
1. Crie um app em [developers.facebook.com](https://developers.facebook.com/apps)
   com o produto WhatsApp.
2. Copie `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_ACCESS_TOKEN`.
3. **Crie e aprove um template de mensagem** chamado `cobranca_disponivel` no
   WhatsApp Manager (obrigatório pela Meta para iniciar conversa fora da
   janela de 24h) com corpo parecido com:
   `"Olá {{1}}, sua cobrança de R$ {{2}} ({{3}}) está disponível: {{4}}"`.
4. O botão "Enviar WhatsApp" na tela de Vendas já chama esse template.

Sem essas variáveis configuradas, o sistema **não quebra**: a venda é criada
normalmente, a cobrança fica pendente sem link/QR Code (pode ser gerada
manualmente fora do sistema), e o botão de WhatsApp registra a falha no log
(`WhatsappMensagem`) sem travar a tela.

## Decisões de arquitetura e trade-offs (autocrítica)

- **Soft delete em `Animal`** (campo `ativo`), hard delete em `Cliente`,
  `Canil`, `Produto`/`Servico` (toggle `ativo` para produto/serviço).
  Motivo: animal tem histórico de vendas/agendamentos que não pode ficar
  órfão; cliente sem histórico pode ser removido de fato. **Risco:** excluir
  um cliente com vendas antigas vai falhar por causa da constraint de FK —
  isso é intencional (evita perder histórico financeiro), mas a mensagem de
  erro hoje é genérica do Prisma. Melhoria futura: capturar esse erro e
  mostrar "não é possível excluir, este cliente tem X vendas".
- **Preço recalculado no servidor** em `vendas/actions.ts`: o formulário
  manda apenas `produtoId`/`servicoId` + quantidade, nunca o preço. Isso
  fecha um vetor óbvio de manipulação de preço via DevTools.
- **Sem fila/job assíncrono para cobrança recorrente de mensalistas.** Hoje
  a criação da cobrança mensal de cada `Assinatura` (todo dia X) **não está
  automatizada** — é o próximo passo natural da Fase 2, via Vercel Cron ou
  um worker separado, criando uma `Cobranca` por assinatura ativa no dia
  configurado. Não implementei isso agora porque exige decidir onde rodar o
  cron (Vercel Cron tem granularidade mínima de 1x/dia no plano gratuito) e
  como lidar com falhas/reprocessamento — vale uma conversa antes de
  implementar para não criar cobranças duplicadas.
- **Sem testes automatizados.** Para um CRM financeiro eu recomendaria pelo
  menos testes de integração no fluxo de `createVenda` (cálculo de total,
  baixa de estoque, geração de cobrança) antes de ir para produção com
  dinheiro real. Não escrevi agora para focar em fechar o escopo funcional
  da Fase 1 primeiro — é o item de maior risco pendente.
- **Sem RBAC granular.** Existe `Role` (ADMIN/ATENDENTE) no schema mas
  nenhuma tela hoje restringe ações por papel. Se o petshop tiver mais de um
  atendente, vale decidir quem pode excluir cadastros/vendas antes de abrir
  o acesso.
- **LGPD:** o sistema guarda CPF, telefone e dados de saúde do animal
  (alergias em `observacoes`). Antes de ir para produção real, vale ter uma
  política de retenção/exclusão de dados de clientes inativos.

## Roadmap sugerido

1. **Agora (Fase 1 — este MVP):** validar cadastros, agenda e vendas manuais
   no dia a dia do petshop.
2. **Fase 2:** ligar Mercado Pago + WhatsApp de verdade (só configurar
   credenciais, código já pronto).
3. **Fase 3:** cron de cobrança recorrente de mensalistas + lembretes de
   agendamento por WhatsApp.
4. **Fase 4:** RBAC por papel, testes automatizados no fluxo financeiro,
   relatórios (DRE simplificado, comissão por atendente).

## Login de teste (após `npm run seed`)

- E-mail: `admin@petshop.local`
- Senha: `petshop123`

**Troque essa senha (ou crie um novo usuário e apague este) antes de usar em
produção.**
