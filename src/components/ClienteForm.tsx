type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    nome?: string;
    telefone?: string;
    documento?: string | null;
    email?: string | null;
    endereco?: string | null;
    observacoes?: string | null;
  };
};

export default function ClienteForm({ action, defaultValues }: Props) {
  return (
    <form action={action} className="card p-6 space-y-4 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nome">Nome completo *</label>
          <input id="nome" name="nome" className="input" defaultValue={defaultValues?.nome} required />
        </div>
        <div>
          <label className="label" htmlFor="telefone">WhatsApp / Telefone *</label>
          <input
            id="telefone"
            name="telefone"
            className="input"
            placeholder="(11) 99999-8888"
            defaultValue={defaultValues?.telefone}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="documento">CPF / CNPJ</label>
          <input id="documento" name="documento" className="input" defaultValue={defaultValues?.documento ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" className="input" defaultValue={defaultValues?.email ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="endereco">Endereço</label>
          <input id="endereco" name="endereco" className="input" defaultValue={defaultValues?.endereco ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="observacoes">Observações</label>
          <textarea id="observacoes" name="observacoes" className="input" rows={3} defaultValue={defaultValues?.observacoes ?? ""} />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Salvar</button>
        <a href="/clientes" className="btn-secondary">Cancelar</a>
      </div>
    </form>
  );
}
