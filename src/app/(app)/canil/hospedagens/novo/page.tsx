import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { createHospedagem } from "../../actions";

export default async function NovoCheckInPage() {
  const { prisma } = await getSessionTenantPrisma();
  const [canisLivres, animais] = await Promise.all([
    prisma.canil.findMany({ where: { status: "LIVRE" }, orderBy: { identificador: "asc" } }),
    prisma.animal.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, include: { cliente: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Novo check-in</h1>

      {canisLivres.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum canil livre no momento.</p>
      ) : (
        <form action={createHospedagem} className="card p-6 space-y-4 max-w-xl">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="animalId">Animal *</label>
              <select id="animalId" name="animalId" className="input" required>
                <option value="">Selecione...</option>
                {animais.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome} ({a.cliente.nome})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="canilId">Canil *</label>
              <select id="canilId" name="canilId" className="input" required>
                <option value="">Selecione...</option>
                {canisLivres.map((c) => (
                  <option key={c.id} value={c.id}>{c.identificador}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="checkIn">Check-in *</label>
              <input id="checkIn" name="checkIn" type="datetime-local" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="checkOutPrevisto">Previsão de saída</label>
              <input id="checkOutPrevisto" name="checkOutPrevisto" type="datetime-local" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="valorDiaria">Valor da diária (R$)</label>
              <input id="valorDiaria" name="valorDiaria" type="number" step="0.01" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="observacoes">Observações</label>
              <textarea id="observacoes" name="observacoes" className="input" rows={2} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary">Registrar check-in</button>
            <a href="/canil/hospedagens" className="btn-secondary">Cancelar</a>
          </div>
        </form>
      )}
    </div>
  );
}
