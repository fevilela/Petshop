import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TIPO_COBRANCA_LABEL } from "@/lib/cobranca-labels";
import DeleteButton from "@/components/DeleteButton";
import { cancelarAssinatura } from "../actions";

/**
 * Detalhe de uma mensalidade: quem assina. Criar/editar a mensalidade em si
 * é em /catalogo/mensalidades — aqui é só assinantes. "Assinar cliente a
 * este plano" também não existe mais aqui: assinatura se cria pelo cadastro
 * do cliente ou vendendo a mensalidade no carrinho de Vendas (ver
 * src/lib/assinatura.ts) — ter dois formulários fazendo a mesma coisa em
 * lugares diferentes era exatamente a confusão que motivou essa reforma.
 */
export default async function PlanoDetalhePage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const mensalidade = await prisma.itemCatalogo.findUnique({
    where: { id: params.id },
    include: {
      assinaturas: { include: { cliente: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!mensalidade || mensalidade.tipo !== "MENSALIDADE") notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{mensalidade.nome}</h1>
          <p className="text-sm text-gray-500">
            {formatCurrency(Number(mensalidade.preco))}/mês · cobrança padrão dia {mensalidade.diaCobrancaPadrao}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/catalogo/mensalidades/${mensalidade.id}/editar`} className="btn-secondary">Editar mensalidade</Link>
          <Link href="/catalogo" className="btn-secondary">Voltar ao catálogo</Link>
        </div>
      </div>

      <div className="card p-4 max-w-xl">
        <h2 className="font-medium text-gray-900 mb-3">Assinantes</h2>
        <p className="text-xs text-gray-500 mb-3">
          Pra assinar um cliente novo, use o cadastro do cliente ou venda esta mensalidade em
          Vendas.
        </p>
        <ul className="divide-y divide-gray-100">
          {mensalidade.assinaturas.map((a) => (
            <li key={a.id} className="py-2 flex items-center justify-between text-sm">
              <span>
                {a.status === "ATIVA" ? (
                  <Link href={`/clientes/${a.clienteId}/editar`} className="text-brand-700 hover:underline">
                    {a.cliente.nome}
                  </Link>
                ) : (
                  a.cliente.nome
                )}
                <span className="text-gray-400">
                  {" "}
                  · desde {formatDate(a.dataInicio)} · dia {a.diaCobranca} ·{" "}
                  {TIPO_COBRANCA_LABEL[a.formaCobranca] ?? a.formaCobranca}
                </span>
                {a.status !== "ATIVA" && <span className="badge bg-gray-100 text-gray-500 ml-2">{a.status}</span>}
              </span>
              {a.status === "ATIVA" && (
                <DeleteButton
                  action={cancelarAssinatura.bind(null, a.id)}
                  confirmMessage={`Cancelar assinatura de ${a.cliente.nome}?`}
                  label="Cancelar assinatura"
                />
              )}
            </li>
          ))}
          {mensalidade.assinaturas.length === 0 && <li className="py-2 text-sm text-gray-500">Nenhum assinante ainda.</li>}
        </ul>
      </div>
    </div>
  );
}
