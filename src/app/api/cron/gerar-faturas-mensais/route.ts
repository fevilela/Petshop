import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarFaturaMensal, referenciaMesAtual } from "@/lib/faturamento";

/**
 * Endpoint protegido pra gerar automaticamente as faturas mensais dos
 * mensalistas — feito pra ser chamado por um Cron Job externo. Este
 * ambiente não provisiona infraestrutura (não crio Cron Jobs no Render por
 * você) — depois do deploy, configure manualmente:
 *
 *   Render → New → Cron Job
 *   Command: curl -fsS -X POST https://SEU-DOMINIO/api/cron/gerar-faturas-mensais \
 *              -H "Authorization: Bearer $CRON_SECRET"
 *   Schedule: 0 6 * * *  (todo dia às 6h — ver README)
 *
 * e defina `CRON_SECRET` (mesmo valor nas duas envs: o Cron Job e o
 * serviço web) com um valor aleatório forte.
 *
 * Roda TODO DIA, não só uma vez por mês: cada Assinatura tem seu próprio
 * `diaCobranca` (dia do mês em que vence), então em vez de "todo dia 5"
 * fixo pra todo mundo, o endpoint checa diariamente quais assinaturas
 * vencem HOJE, em TODAS as empresas (não tem sessão de usuário aqui).
 *
 * Idempotente: gerarFaturaMensal já checa se a fatura do mês já existe
 * antes de criar (e o banco tem um índice único assinaturaId+referenciaMes
 * como segunda trava) — rodar este endpoint mais de uma vez no mesmo dia
 * não duplica cobrança.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, erro: "CRON_SECRET não configurado no servidor." },
      { status: 500 }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  }

  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const referenciaMes = referenciaMesAtual(hoje);

  const assinaturas = await prisma.assinatura.findMany({
    where: { status: "ATIVA", diaCobranca: diaHoje },
    select: { id: true, empresaId: true },
  });

  const resultados: { assinaturaId: string; ok: boolean; motivo?: string; cobrancaId?: string }[] = [];

  for (const a of assinaturas) {
    try {
      const r = await gerarFaturaMensal(a.empresaId, a.id, referenciaMes);
      resultados.push({ assinaturaId: a.id, ...r });
    } catch (err) {
      console.error(`[cron faturas] Falha ao gerar fatura da assinatura ${a.id}:`, err);
      resultados.push({
        assinaturaId: a.id,
        ok: false,
        motivo: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    referenciaMes,
    diaHoje,
    totalElegiveis: assinaturas.length,
    geradas: resultados.filter((r) => r.ok).length,
    resultados,
  });
}

/** Só pra checar rapidamente (no navegador, por ex.) que a rota existe e está no ar. */
export async function GET() {
  return NextResponse.json({ ok: true, info: "Use POST com header Authorization: Bearer <CRON_SECRET>." });
}
