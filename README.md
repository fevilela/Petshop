# Petshop CRM (SaaS multi-tenant)

CRM para petshop + hotelzinho — cadastros de clientes, animais, canil,
produtos e serviços, agenda, vendas (avulsas e mensalistas), financeiro
(contas a pagar/receber) e cobrança via Mercado Pago com envio automático
pelo WhatsApp.

Este não é mais um sistema single-tenant para um único petshop: é a base de
um **SaaS** — você (Fernanda) cadastra petshops-clientes, cada um com login e
credenciais próprias de Mercado Pago/WhatsApp, e opera tudo a partir de uma
área `/admin`.

## Stack e por quê

- **Next.js 14 (App Router) + TypeScript** — um único deploy (frontend +
  backend via Server Actions/Route Handlers).
- **Prisma + PostgreSQL** — schema tipado, migrations versionadas.
- **NextAuth (Credentials + JWT)** — login de e-mail/senha; a sessão carrega
  `role` (`SUPER_ADMIN` / `EMPRESA_ADMIN` / `EMPRESA_ATENDENTE`) e `empresaId`.
- **Server Actions em vez de API REST própria.**
- **Zero SDKs pesados para integrações externas** — `lib/mercadopago.ts` e
  `lib/whatsapp.ts` usam `fetch` direto contra as APIs REST.

## Arquitetura multi-tenant: banco único, isolado por `empresaId`

Cada petshop-cliente é uma linha em `Empresa`. Todo model operacional
(`Cliente`, `Animal`, `Venda`, `Cobranca`, etc.) tem uma coluna `empresaId` e
todos vivem no **mesmo banco Postgres** — não existe mais um banco físico
separado por empresa.

**Por que não um banco por empresa?** Chegamos a implementar essa versão
(provisionamento automático de um projeto Supabase por petshop via
Management API). Ela dá isolamento mais forte, mas tem um custo real cedo
demais para este estágio: um projeto Supabase por cliente esbarra rápido no
limite de projetos gratuitos, provisionar um banco novo leva minutos e exige
orquestração (criar projeto → esperar ficar pronto → rodar migration →
guardar connection string), e cada deploy de schema precisa rodar contra N
bancos em vez de 1. Isso é justificável quando há dezenas/centenas de
clientes com requisitos de isolamento fortes (ex: contratuais); não é o
problema certo para resolver com poucos clientes. **Trade-off assumido:**
menos isolamento físico, ganho grande de simplicidade operacional agora. O
código do provisionamento automático (`src/lib/supabase-management.ts`)
ficou no repositório, sem uso — dá pra retomar essa rota depois sem
reescrever do zero, se/quando fizer sentido.

**Como o isolamento é garantido sem banco físico separado:** nenhuma tela ou
Server Action monta `where: { empresaId }` manualmente (isso seria fácil de
esquecer em algum lugar, e um esquecimento = vazamento de dados entre
clientes). Em vez disso, `src/lib/tenant-prisma.ts` usa um **Prisma Client
Extension** que intercepta toda query do Prisma Client e injeta
`empresaId` automaticamente — em `where` para leitura/atualização/exclusão, e
em `data` para criação. Todo código de tela/Server Action só faz:

```ts
const { prisma } = await getSessionTenantPrisma(); // dentro de uma page/action logada
const clientes = await prisma.cliente.findMany(); // já vem só da empresa certa
```

**Limitação conhecida do extension:** ele não cobre escritas *aninhadas*
dentro de um único `create`/`update` (ex: `venda.create({ data: { itens: {
create: [...] } } })` não intercepta a criação dos `ItemVenda`). O único
model afetado por isso hoje é `ItemVenda`, que por isso não tem `empresaId`
próprio de propósito — só existe aninhado numa `Venda` já filtrada
corretamente (ver comentário no `prisma/schema.prisma`). No único lugar onde
usamos uma transação interativa (`$transaction(async (tx) => ...)`, em
`vendas/actions.ts`), passamos `empresaId` explicitamente também, como
reforço — não confiamos apenas na propagação do extension para dentro do
client `tx` sem poder testar isso ao vivo.

**Autenticação central:** só você cria usuários (por enquanto). Ao cadastrar
um petshop-cliente em `/admin/empresas/novo`, o sistema cria a `Empresa`, cria
o usuário `EMPRESA_ADMIN` responsável e manda um e-mail (Resend) com link de
convite (`/convite/[token]`) para ele definir a própria senha. O mesmo
admin do petshop pode então pedir para você criar acessos adicionais
(atendentes) — ainda sem self-service.

**Credenciais por petshop:** cada empresa configura seu próprio token do
Mercado Pago e credenciais do WhatsApp Business em `/configuracoes` (só
`EMPRESA_ADMIN` vê/edita). Ficam criptografadas (AES-256-GCM,
`src/lib/crypto.ts`) na tabela `Empresa`. O webhook do Mercado Pago é por
tenant: `/api/webhooks/mercadopago/[empresaId]`.

## Modelo de dados (resumo)

`Empresa` (petshop-cliente) · `Usuario` (login, com `role` e `empresaId`
opcional para `SUPER_ADMIN`) · `ConviteUsuario` (token de definição de
senha) — e, escopados por `empresaId`: `Cliente` → `Animal` (1:N) · `Canil`
↔ `Hospedagem` ↔ `Animal` · `Produto` / `Servico` (catálogo) · `Plano`
(template mensal) → `PlanoItem` · `Assinatura` (cliente + plano =
"mensalista") · `Venda` → `ItemVenda` · `Cobranca` (boleto/Pix/link) ·
`ContaPagar` / `ContaReceber` · `Agendamento` · `WhatsappMensagem` (log).

**Como funciona "alguns clientes são mensalistas, outros não":** não existe
um campo booleano fixo no `Cliente`. Um cliente vira mensalista ao ganhar
uma `Assinatura` ativa a um `Plano`. Na tela de Vendas, ao escolher a forma
de pagamento "Mensalista", a venda é debitada da assinatura (sem gerar
cobrança nova); qualquer outra forma de pagamento segue o fluxo avulso
normal.

**Nota sobre `Venda.numero`:** é uma sequência global (autoincrement do
Postgres), não por empresa — o petshop A pode ter a venda #47 e o petshop B
a #48, intercalados. Cosmético, não afeta nada funcionalmente; se algum dia
precisar de numeração sequencial por empresa começando em 1, isso exige um
contador por tabela (Postgres não faz autoincrement agrupado nativamente) —
não implementado agora.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL, ENCRYPTION_KEY e NEXTAUTH_SECRET no mínimo
npx prisma migrate dev --name init
npm run seed            # cria seu login de SUPER_ADMIN + uma empresa de demonstração
npm run dev
```

Banco de dados: qualquer Postgres serve (Neon, Supabase, Railway). Se usar
Supabase, use a connection string do **Session Pooler** (a conexão direta é
IPv6-only e não funciona a partir do Render/Vercel).

`ENCRYPTION_KEY` / `NEXTAUTH_SECRET`: gere com
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

## Deploy (Render/Vercel + banco gerenciado)

1. Suba o projeto num repositório Git e importe no Render/Vercel.
2. Configure as variáveis de ambiente do `.env.example`.
3. Rode `npx prisma migrate deploy` contra o banco de produção antes do
   primeiro deploy, depois `npm run seed` (ou só a parte do SUPER_ADMIN, se
   não quiser os dados de demonstração) para criar seu login.
4. Aponte `NEXTAUTH_URL` e `APP_URL` para o domínio final.

## Fluxo de cadastro de um petshop-cliente

1. Você entra em `/admin/empresas/novo` e preenche nome, CNPJ, responsável.
2. O sistema cria a `Empresa` (já `ATIVA` — não tem mais espera de
   provisionamento) e o usuário `EMPRESA_ADMIN`, e manda o e-mail de convite.
3. O responsável clica no link, define a senha (`/convite/[token]`), e já
   consegue logar.
4. Ele mesmo (ou você, a pedido dele) configura Mercado Pago e WhatsApp em
   `/configuracoes`, e pode pedir a você para criar acessos de atendente.

## Mercado Pago e WhatsApp (por petshop)

Cada petshop-cliente configura as próprias credenciais em `/configuracoes`
(não são mais env vars globais):

**Mercado Pago**
1. O responsável cria uma aplicação em
   [mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel)
   e cola o Access Token de produção em `/configuracoes`.
2. Configura a URL de notificações mostrada na própria tela
   (`https://seu-dominio/api/webhooks/mercadopago/<empresaId>`) no painel de
   Webhooks do Mercado Pago dele — é isso que atualiza `Cobranca.status`
   para `PAGO` automaticamente.

**WhatsApp Cloud API**
1. Cria um app em [developers.facebook.com](https://developers.facebook.com/apps)
   com o produto WhatsApp e cola `Phone Number ID` / `Access Token` em
   `/configuracoes`.
2. **Precisa criar e aprovar um template de mensagem** chamado
   `cobranca_disponivel` no WhatsApp Manager (obrigatório pela Meta para
   iniciar conversa fora da janela de 24h), com corpo parecido com:
   `"Olá {{1}}, sua cobrança de R$ {{2}} ({{3}}) está disponível: {{4}}"`.

Sem essas credenciais configuradas, o sistema **não quebra**: a venda é
criada normalmente, a cobrança fica pendente sem link/QR Code, e o botão de
WhatsApp registra a falha no log (`WhatsappMensagem`) sem travar a tela.

## Decisões de arquitetura e trade-offs (autocrítica)

- **Isolamento por `empresaId` num banco único, não por banco físico.** Ver
  seção "Arquitetura multi-tenant" acima — é o trade-off mais importante
  deste projeto, revertido de uma versão anterior com banco por tenant.
  **Risco residual:** qualquer query que use `prisma.$queryRaw`/SQL cru no
  futuro PRECISA filtrar `empresaId` manualmente — o extension só cobre a
  API normal do Prisma Client. Hoje não há nenhum `$queryRaw` no código.
- **Soft delete em `Animal`** (campo `ativo`), hard delete em `Cliente`,
  `Canil`, `Produto`/`Servico` (toggle `ativo` para produto/serviço).
  Motivo: animal tem histórico de vendas/agendamentos que não pode ficar
  órfão; cliente sem histórico pode ser removido de fato.
- **Preço recalculado no servidor** em `vendas/actions.ts`: o formulário
  manda apenas `produtoId`/`servicoId` + quantidade, nunca o preço.
- **Sem fila/job assíncrono para cobrança recorrente de mensalistas.** A
  criação da cobrança mensal de cada `Assinatura` não está automatizada —
  próximo passo natural, via cron, criando uma `Cobranca` por assinatura
  ativa no dia configurado.
- **Sem testes automatizados.** Para um CRM financeiro multi-tenant, o item
  de maior risco pendente é não ter testes de integração cobrindo
  `createVenda` (cálculo de total, baixa de estoque, geração de cobrança,
  e — agora — isolamento entre empresas).
- **LGPD:** o sistema guarda CPF, telefone e dados de saúde do animal
  (alergias em `observacoes`), agora multiplicado por N petshops-clientes.
  Antes de operar com clientes reais, vale ter contrato de processamento de
  dados com cada petshop-cliente e política de retenção/exclusão.

## Roadmap sugerido

1. **Agora:** validar o fluxo de cadastro de petshop-cliente + convite +
   login ponta a ponta com dados reais.
2. **Próximo:** cron de cobrança recorrente de mensalistas + lembretes de
   agendamento por WhatsApp.
3. **Depois:** self-service (petshop-cliente convida os próprios atendentes,
   sem passar por você), testes automatizados no fluxo financeiro,
   relatórios entre empresas (uso, faturamento da plataforma).
4. **Se/quando a base de clientes crescer:** reavaliar isolamento por banco
   físico (código-base já existe em `src/lib/supabase-management.ts`).

## Login (após `npm run seed`)

- SUPER_ADMIN: o e-mail/senha definidos em `SUPER_ADMIN_EMAIL` /
  `SUPER_ADMIN_SENHA` no seu `.env` (senão usa um padrão inseguro — o seed
  avisa no terminal). Entre em `/admin/empresas` para cadastrar o primeiro
  petshop-cliente.
- Empresa de demonstração ("Petshop Demo"): não tem usuário próprio no seed
  — crie um em `/admin/empresas` (usando o e-mail responsável do seed,
  `demo@petshop.local`, ou edite o seed) se quiser logar como
  `EMPRESA_ADMIN` para testar as telas operacionais.
