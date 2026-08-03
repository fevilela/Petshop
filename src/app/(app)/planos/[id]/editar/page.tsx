import { notFound } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { updatePlano } from "../../actions";

export default async function EditarPlanoPage({ params }: { params: { id: string } }) {
  const { prisma } = await getSessionTenantPrisma();
  const plano = await prisma.plano.findUnique({ where: { id: params.id } });
  if (!plano) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Editar plano</h1>
      <form action={updatePlano.bind(null, plano.id)} className="card p-6 space-y-4 max-w-xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="nome">Nome do plano *</label>
            <input id="nome" name="nome" className="input" defaultValue={plano.nome} required />
          </div>
          <div>
            <label className="label" htmlFor="valorMensal">Valor mensal (R$) *</label>
            <input id="valorMensal" name="valorMensal" type="number" step="0.01" className="input" defaultValue={String(plano.valorMensal)} required />
          </div>
          <div>
            <label className="label" htmlFor="diaCobrancaPadrao">Dia de cobrança padrão</label>
            <input id="diaCobrancaPadrao" name="diaCobrancaPadrao" type="number" min={1} max={28} className="input" defaultValue={plano.diaCobrancaPadrao} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="descricao">Descrição</label>
            <textarea id="descricao" name="descricao" className="input" rows={2} defaultValue={plano.descricao ?? ""} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">Salvar</button>
          <a href={`/planos/${plano.id}`} className="btn-secondary">Cancelar</a>
        </div>
      </form>
    </div>
  );
}
