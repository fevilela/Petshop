# Petshop CRM (SaaS multi-tenant)

CRM para petshop + hotelzinho — cadastros de clientes, animais, canil,
produtos e serviços, agenda, vendas (avulsas e mensalistas), financeiro
(contas a pagar/receber) e cobrança via Mercado Pago com envio pelo WhatsApp
(link direto, sem integração/credencial nenhuma).

Este não é mais um sistema single-tenant para um único petshop: é a base de
um **SaaS** — você (Fernanda) cadastra petshops-clientes, cada um com login e
credencial própria de Mercado Pago, e opera tudo a partir de uma área
`/admin`.

## Stack e por quê

- **Next.js 14 (App Router) + TypeScript** — um único deploy (frontend +
  backend via Server Actions/Route Handlers).
- **Prisma + PostgreSQL** — schema tipado, migrations versionadas.
- **NextAuth (Credentials + JWT)** — login de e-mail/senha; a sessão carrega
  `role` (`SUPER_ADMIN` / `EMPRESA_ADMIN` / `EMPRESA_ATENDENTE`) e `empresaId`.
- **Server Actions em vez de API REST própria.**
- **Zero SDKs pesados para integrações externas** — `lib/mercadopago.ts`
  usa `fetch` direto contra a API REST. WhatsApp não tem integração: é link
  direto (`wa.me`), ver seção própria abaixo.

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
Mercado Pago em `/configuracoes` (só `EMPRESA_ADMIN` vê/edita). Fica
criptografado (AES-256-GCM, `src/lib/crypto.ts`) na tabela `Empresa`. O
webhook do Mercado Pago é por tenant: `/api/webhooks/mercadopago/[empresaId]`.
WhatsApp não precisa de credencial — ver seção própria abaixo.

## Modelo de dados (resumo)

`Empresa` (petshop-cliente) · `Usuario` (login, com `role` e `empresaId`
opcional para `SUPER_ADMIN`) · `ConviteUsuario` (token de definição de
senha) — e, escopados por `empresaId`: `Cliente` → `Animal` (1:N) · `Canil`
↔ `Hospedagem` ↔ `Animal` · `Produto` / `Servico` (catálogo) · `Plano`
(template mensal) → `PlanoItem` · `Assinatura` (cliente + plano =
"mensalista") · `Venda` → `ItemVenda` · `Cobranca` (boleto/Pix/link — de uma
`Venda` avulsa OU consolidada de uma `Assinatura`, ver "Faturamento mensal")
· `ContaPagar` / `ContaReceber` · `Agendamento`.

**Como funciona "alguns clientes são mensalistas, outros não":** não existe
um campo booleano fixo no `Cliente`. Um cliente vira mensalista ao ganhar
uma `Assinatura` ativa a um `Plano`. Na tela de Vendas, ao escolher a forma
de pagamento "Mensalista", a venda é debitada da assinatura (sem gerar
cobrança nova); com "Lançar na fatura mensal" a venda fica pendente
(`faturaCobrancaId` nulo) até entrar numa fatura consolidada — ver seção
"Faturamento mensal" abaixo; qualquer outra forma de pagamento segue o
fluxo avulso normal (cobrança gerada e cobrada na hora).

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
4. Ele mesmo (ou você, a pedido dele) configura o Mercado Pago em
   `/configuracoes`, e pode pedir a você para criar acessos de atendente.
   WhatsApp não precisa de configuração nenhuma (ver seção abaixo).

## Mercado Pago (por petshop) e WhatsApp (link direto)

**Mercado Pago** — cada petshop-cliente configura o próprio token em
`/configuracoes` (não é mais env var global):
1. O responsável cria uma aplicação em
   [mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel)
   e cola o Access Token de produção em `/configuracoes`.
2. `notification_url` já é enviada automaticamente em toda cobrança criada
   (Pix, boleto, link) apontando pro webhook desta empresa
   (`/api/webhooks/mercadopago/<empresaId>`) — não precisa configurar nada
   manualmente no painel do Mercado Pago para isso funcionar. A URL também
   aparece pronta em `/configuracoes`, caso quiera configurar manualmente
   como reforço.

Sem o token configurado, o sistema **não quebra**: a venda é criada
normalmente, a cobrança fica pendente sem link/QR Code (avisado na tela de
detalhe da venda).

**WhatsApp** — não tem integração/API nenhuma, de propósito. O envio da
cobrança é por link direto (`wa.me/<telefone>?text=...`, ver
`src/lib/utils.ts`/`linkWhatsapp`): o botão "Abrir no WhatsApp" na tela da
venda já monta a mensagem e abre o WhatsApp (app ou web) de quem clicar,
pronto pra revisar e enviar. Chegamos a implementar a WhatsApp Cloud API
oficial da Meta (template aprovado, Phone Number ID, Business Account ID,
Access Token por empresa) e removemos: pra um SaaS com vários
petshops-clientes, cada um teria que passar pela verificação de negócio e
aprovação de template da Meta antes de conseguir mandar a primeira
cobrança — fricção grande demais pro estágio atual. **Trade-off assumido:**
perde o envio 100% automático (sem humano no loop) e o rastreamento de
entrega, ganha zero setup e zero risco de bloqueio/custo por mensagem. Se
o volume justificar mais adiante, dá pra reintroduzir a Cloud API (ou um
BSP tipo Twilio/360dialog) como opção adicional, não como substituição.

## Faturamento mensal (mensalistas)

Problema que essa feature resolve: um cliente é mensalista (tem `Assinatura`
ativa) e, durante o mês, também compra coisas avulsas (ex: um shampoo). Antes
não existia lugar nenhum pra esse consumo aparecer — agora ele pode ser
lançado como "notinha" e entrar numa fatura única no fim do mês, em vez de
virar uma cobrança avulsa isolada.

**Modelagem — reaproveita `Cobranca`, não é um model novo.** Uma fatura
mensal é uma `Cobranca` normal com `assinaturaId` preenchido e `vendaId`
nulo (o inverso da cobrança de uma venda avulsa comum, que tem `vendaId` e
`assinaturaId` nulo). `@@unique([assinaturaId, referenciaMes])` no banco
garante que não existam duas faturas do mesmo mês pra mesma assinatura —
trava de banco, não só de aplicação (Postgres não colide `NULL`, então essa
constraint não afeta as `Cobranca`s de venda avulsa, que têm `assinaturaId`
nulo).

**Fluxo de uma venda avulsa de um mensalista:**
1. Na tela de Vendas, forma de pagamento **"Lançar na fatura mensal"**
   (`A_FATURAR`) — a venda é criada normalmente (baixa estoque, etc.), mas
   sem gerar cobrança própria; fica marcada como pendente de fatura
   (`Venda.faturaCobrancaId = null`).
2. Em **Faturamento mensal** (`/planos/faturamento`) você vê, por
   assinatura ativa, a prévia do mês: mensalidade + soma das vendas
   pendentes = total. Um clique em "Gerar fatura" cria a `Cobranca`
   consolidada (Pix, vencimento em 3 dias) e marca todas as vendas incluídas
   com o `faturaCobrancaId` dela — a partir daí elas não entram mais em
   nenhuma fatura futura.
3. A tela de detalhe da fatura (`/planos/faturamento/<cobrancaId>`) mostra a
   composição (mensalidade + cada venda, com link pra venda original) e o
   mesmo painel de cobrança (Pix/QR/link, marcar paga, verificar pagamento,
   abrir no WhatsApp) usado na venda avulsa.
4. Se o cliente quiser pagar a compra avulsa na hora em vez de esperar a
   fatura, é só usar qualquer outra forma de pagamento (Pix, cartão etc.) —
   vira uma venda avulsa normal, fora da fatura. As duas opções convivem.

**Geração automática (cron):** cada `Assinatura` tem seu próprio
`diaCobranca`. Um endpoint protegido, `POST /api/cron/gerar-faturas-mensais`,
roda **todo dia** (não uma vez por mês fixo) e gera a fatura de toda
assinatura ativa cujo `diaCobranca` seja hoje, em todas as empresas. É
idempotente (não duplica se rodar mais de uma vez no mesmo dia, tanto por
checagem na aplicação quanto pela constraint única do banco).

**Este ambiente não provisiona infraestrutura — você precisa criar o Cron
Job manualmente no Render depois do deploy:**
1. Gere um segredo forte: mesmo comando do `ENCRYPTION_KEY`
   (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
2. Defina `CRON_SECRET` com esse valor em **duas envs**: no serviço web
   (mesmo lugar de `DATABASE_URL` etc.) e no Cron Job que você vai criar a
   seguir — precisam ser idênticos.
3. No Render: **New → Cron Job**, mesmo repositório/branch do serviço web.
   - **Schedule:** `0 6 * * *` (todo dia às 6h — ajuste o horário à vontade,
     é isso que define quando as faturas do dia são geradas).
   - **Command:**
     ```
     curl -fsS -X POST https://SEU-DOMINIO/api/cron/gerar-faturas-mensais \
       -H "Authorization: Bearer $CRON_SECRET"
     ```
4. Sem esse Cron Job configurado, o sistema não quebra: a geração manual
   pela tela de Faturamento mensal continua funcionando normalmente, só não
   acontece sozinha.

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
- **Cron do faturamento mensal é um endpoint HTTP chamado externamente, não
  um job/fila interno.** Optei por não introduzir infraestrutura de fila
  (BullMQ, etc.) só pra rodar uma vez por dia — um Route Handler protegido
  por `CRON_SECRET`, chamado por um Cron Job externo (Render), resolve o
  caso de uso sem dependência nova. **Risco residual:** se o Cron Job
  externo falhar silenciosamente (não configurado, `CRON_SECRET` errado,
  domínio errado), a fatura daquele dia simplesmente não é gerada — não há
  alerta automático hoje; a tela `/planos/faturamento` sempre permite gerar
  manualmente como fallback, mas vale monitorar os logs do Cron Job de vez
  em quando.
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
   login ponta a ponta com dados reais; configurar o Cron Job do
   faturamento mensal no Render (ver seção "Faturamento mensal" — passo
   manual, não é criado automaticamente).
2. **Próximo:** lembrete de agendamento por WhatsApp automático (sem humano
   clicando) exigiria voltar a ter alguma integração (Cloud API ou BSP) —
   hoje o link direto não cobre esse caso, só envio sob demanda.
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
