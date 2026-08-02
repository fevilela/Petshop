import { createPlano } from "../actions";

export default function NovoPlanoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Novo plano</h1>
      <form action={createPlano} className="card p-6 space-y-4 max-w-xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="nome">Nome do plano *</label>
            <input id="nome" name="nome" className="input" placeholder="Banho Mensal 4x" required />
          </div>
          <div>
            <label className="label" htmlFor="valorMensal">Valor mensal (R$) *</label>
            <input id="valorMensal" name="valorMensal" type="number" step="0.01" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="diaCobrancaPadrao">Dia de cobrança padrão</label>
            <input id="diaCobrancaPadrao" name="diaCobrancaPadrao" type="number" min={1} max={28} className="input" defaultValue={5} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="descricao">Descrição</label>
            <textarea id="descricao" name="descricao" className="input" rows={2} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">Criar plano</button>
          <a href="/planos" className="btn-secondary">Cancelar</a>
        </div>
      </form>
    </div>
  );
}
