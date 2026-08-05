import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { getModulosEfetivosSessao, type ModuloKey } from "@/lib/modulos";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";

type Card = { label: string; value: string | number; href: string; modulo?: ModuloKey; alerta?: boolean };

export default async function DashboardPage() {
  const { prisma } = await getSessionTenantPrisma();
  const modulosPermitidos = await getModulosEfetivosSessao();
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    totalClientes,
    totalAnimais,
    assinaturasAtivas,
    vendasMes,
    cobrancasPendentes,
    cobrancasVencidas,
    faturasAguardandoEnvio,
    proximosAgendamentos,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.animal.count({ where: { ativo: true } }),
    prisma.assinatura.count({ where: { status: "ATIVA" } }),
    prisma.venda.aggregate({
      _sum: { valorTotal: true },
      _count: true,
      where: { createdAt: { gte: inicioMes }, status: "CONCLUIDA" },
    }),
    prisma.cobranca.count({ where: { status: "PENDENTE" } }),
    prisma.cobranca.count({
      where: { status: "PENDENTE", dataVencimento: { lt: new Date() } },
    }),
    // Faturas mensais consolidadas (assinaturaId setado) já geradas — pelo
    // atendente ou pelo cron — mas que ninguém ainda clicou em "Abrir no
    // WhatsApp": é o lembrete que fecha a lacuna do envio não ser mais
    // automático (ver README "Faturamento mensal").
    prisma.cobranca.count({
      where: { assinaturaId: { not: null }, status: "PENDENTE", notificadoClienteEm: null },
    }),
    prisma.agendamento.findMany({
      where: { dataHoraInicio: { gte: new Date() }, status: { in: ["AGENDADO", "CONFIRMADO"] } },
      orderBy: { dataHoraInicio: "asc" },
      take: 5,
      include: { cliente: true, animal: true, itemCatalogo: true },
    }),
  ]);

  // Anotar a lista bruta como Card[] ANTES do .filter(): se a anotação ficar
  // só em `cards` (const cards: Card[] = [...].filter(...)), o literal do
  // array não recebe tipagem contextual — TS infere `modulo` como `string`
  // solto (alargado), e falha ao checar contra `Card[]` no final. Mesma
  // classe de bug do empresaId ausente no create: tipo requerido não bate
  // por causa de como a inferência de literal funciona nesse ponto do código.
  const todosOsCards: Card[] = [
    { label: "Clientes", value: totalClientes, href: "/clientes" },
    { label: "Animais ativos", value: totalAnimais, href: "/animais", modulo: "animais" },
    { label: "Mensalistas ativos", value: assinaturasAtivas, href: "/planos", modulo: "planos" },
    {
      label: "Faturas aguardando envio",
      value: faturasAguardandoEnvio,
      href: "/planos/faturamento",
      modulo: "planos",
      alerta: faturasAguardandoEnvio > 0,
    },
    {
      label: "Vendas no mês",
      value: `${vendasMes._count} · ${formatCurrency(Number(vendasMes._sum.valorTotal ?? 0))}`,
      href: "/vendas",
      modulo: "vendas",
    },
    { label: "Cobranças pendentes", value: cobrancasPendentes, href: "/financeiro/contas-a-receber", modulo: "financeiro" },
    {
      label: "Cobranças vencidas",
      value: cobrancasVencidas,
      href: "/financeiro/contas-a-receber",
      modulo: "financeiro",
      alerta: cobrancasVencidas > 0,
    },
  ];
  const cards = todosOsCards.filter((c) => !c.modulo || modulosPermitidos.includes(c.modulo));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Painel</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`card p-4 hover:shadow-md transition-shadow ${
              c.alerta ? "border-red-300 bg-red-50" : ""
            }`}
          >
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${c.alerta ? "text-red-700" : "text-gray-900"}`}>
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      {modulosPermitidos.includes("agenda") && (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900">Próximos agendamentos</h2>
          <Link href="/agenda" className="text-sm text-brand-700 hover:underline">
            Ver agenda completa
          </Link>
        </div>
        {proximosAgendamentos.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum agendamento futuro.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {proximosAgendamentos.map((a) => (
              <li key={a.id} className="py-2.5 flex justify-between text-sm">
                <span>
                  <strong>{a.cliente.nome}</strong> · {a.animal.nome}
                  {a.itemCatalogo ? ` · ${a.itemCatalogo.nome}` : ""}
                </span>
                <span className="text-gray-500">{formatDateTime(a.dataHoraInicio)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
    </div>
  );
}
