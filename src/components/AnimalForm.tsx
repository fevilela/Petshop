type Cliente = { id: string; nome: string };

type Props = {
  action: (formData: FormData) => Promise<void>;
  clientes: Cliente[];
  defaultValues?: {
    nome?: string;
    clienteId?: string;
    especie?: string;
    raca?: string | null;
    porte?: string | null;
    dataNascimento?: Date | null;
    pesoKg?: unknown;
    observacoes?: string | null;
  };
};

export default function AnimalForm({ action, clientes, defaultValues }: Props) {
  const dataNasc = defaultValues?.dataNascimento
    ? new Date(defaultValues.dataNascimento).toISOString().slice(0, 10)
    : "";

  return (
    <form action={action} className="card p-6 space-y-4 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="nome">Nome do animal *</label>
          <input id="nome" name="nome" className="input" defaultValue={defaultValues?.nome} required />
        </div>
        <div>
          <label className="label" htmlFor="clienteId">Tutor *</label>
          <select id="clienteId" name="clienteId" className="input" defaultValue={defaultValues?.clienteId} required>
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="especie">Espécie *</label>
          <input id="especie" name="especie" className="input" placeholder="Cão, Gato..." defaultValue={defaultValues?.especie} required />
        </div>
        <div>
          <label className="label" htmlFor="raca">Raça</label>
          <input id="raca" name="raca" className="input" defaultValue={defaultValues?.raca ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="porte">Porte</label>
          <select id="porte" name="porte" className="input" defaultValue={defaultValues?.porte ?? ""}>
            <option value="">—</option>
            <option value="PEQUENO">Pequeno</option>
            <option value="MEDIO">Médio</option>
            <option value="GRANDE">Grande</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="dataNascimento">Data de nascimento</label>
          <input id="dataNascimento" name="dataNascimento" type="date" className="input" defaultValue={dataNasc} />
        </div>
        <div>
          <label className="label" htmlFor="pesoKg">Peso (kg)</label>
          <input id="pesoKg" name="pesoKg" type="number" step="0.1" className="input" defaultValue={defaultValues?.pesoKg ? String(defaultValues.pesoKg) : ""} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="observacoes">Observações (alergias, cuidados especiais...)</label>
          <textarea id="observacoes" name="observacoes" className="input" rows={3} defaultValue={defaultValues?.observacoes ?? ""} />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Salvar</button>
        <a href="/animais" className="btn-secondary">Cancelar</a>
      </div>
    </form>
  );
}
