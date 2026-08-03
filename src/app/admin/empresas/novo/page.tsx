import { criarEmpresaAction } from "../actions";

export default function NovaEmpresaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Cadastrar petshop-cliente</h1>
      <p className="text-sm text-gray-500 max-w-xl">
        Ao salvar, o sistema cria um banco novo na Supabase automaticamente e envia um
        e-mail para o responsável definir a senha de acesso. Isso leva alguns minutos —
        acompanhe o status na lista de petshops.
      </p>

      <form action={criarEmpresaAction} className="card p-6 space-y-4 max-w-xl">
        <div>
          <label className="label" htmlFor="nomeEmpresa">Nome do petshop *</label>
          <input id="nomeEmpresa" name="nomeEmpresa" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="documento">CNPJ</label>
          <input id="documento" name="documento" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="nomeResponsavel">Nome do responsável *</label>
          <input id="nomeResponsavel" name="nomeResponsavel" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="emailResponsavel">E-mail do responsável *</label>
          <input id="emailResponsavel" name="emailResponsavel" type="email" className="input" required />
          <p className="text-xs text-gray-500 mt-1">É para este e-mail que o link de acesso vai ser enviado.</p>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">Cadastrar e provisionar</button>
          <a href="/admin/empresas" className="btn-secondary">Cancelar</a>
        </div>
      </form>
    </div>
  );
}
