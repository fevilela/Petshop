import { MODULOS } from "@/lib/modulos";
import { criarEmpresaAction } from "../actions";

export default function NovaEmpresaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Cadastrar petshop-cliente</h1>
      <p className="text-sm text-gray-500 max-w-xl">
        Ao salvar, o sistema cria o acesso e envia um e-mail para o responsável definir a
        senha — já pode usar na hora.
      </p>

      <form action={criarEmpresaAction} className="card p-6 space-y-6 max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="nomeEmpresa">Nome do petshop *</label>
            <input id="nomeEmpresa" name="nomeEmpresa" className="input" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="tipoDocumento">Documento</label>
              <select id="tipoDocumento" name="tipoDocumento" className="input">
                <option value="CNPJ">CNPJ</option>
                <option value="CPF">CPF</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="documento">Número</label>
              <input id="documento" name="documento" className="input" placeholder="Só números" />
            </div>
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
        </div>

        <div className="border-t pt-4">
          <h2 className="font-medium text-gray-900 mb-1">Mercado Pago (opcional)</h2>
          <p className="text-xs text-gray-500 mb-2">
            Se você já tiver o Access Token do petshop, pode preencher aqui. Senão, o próprio
            responsável configura depois em Configurações.
          </p>
          <label className="label" htmlFor="mercadoPagoAccessToken">Access Token de produção</label>
          <input id="mercadoPagoAccessToken" name="mercadoPagoAccessToken" className="input" placeholder="APP_USR-..." />
        </div>

        <div className="border-t pt-4">
          <h2 className="font-medium text-gray-900 mb-1">Módulos habilitados</h2>
          <p className="text-xs text-gray-500 mb-3">
            O que esse petshop vai poder acessar. Clientes e Painel ficam sempre disponíveis.
            Dá pra ajustar depois na página do petshop, e restringir por usuário também.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {MODULOS.map((m) => (
              <label key={m.key} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name={`modulo_${m.key}`} defaultChecked className="rounded border-gray-300" />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">Cadastrar</button>
          <a href="/admin/empresas" className="btn-secondary">Cancelar</a>
        </div>
      </form>
    </div>
  );
}
