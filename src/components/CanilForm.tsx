type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    identificador?: string;
    tipoPorte?: string | null;
    capacidade?: number;
    status?: string;
    observacoes?: string | null;
  };
};

export default function CanilForm({ action, defaultValues }: Props) {
  return (
    <form action={action} className="card p-6 space-y-4 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="identificador">Identificador *</label>
          <input id="identificador" name="identificador" className="input" placeholder="Canil 01" defaultValue={defaultValues?.identificador} required />
        </div>
        <div>
          <label className="label" htmlFor="tipoPorte">Porte suportado</label>
          <select id="tipoPorte" name="tipoPorte" className="input" defaultValue={defaultValues?.tipoPorte ?? ""}>
            <option value="">Qualquer</option>
            <option value="PEQUENO">Pequeno</option>
            <option value="MEDIO">Médio</option>
            <option value="GRANDE">Grande</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="capacidade">Capacidade</label>
          <input id="capacidade" name="capacidade" type="number" min={1} className="input" defaultValue={defaultValues?.capacidade ?? 1} />
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" className="input" defaultValue={defaultValues?.status ?? "LIVRE"}>
            <option value="LIVRE">Livre</option>
            <option value="OCUPADO">Ocupado</option>
            <option value="MANUTENCAO">Manutenção</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="observacoes">Observações</label>
          <textarea id="observacoes" name="observacoes" className="input" rows={2} defaultValue={defaultValues?.observacoes ?? ""} />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Salvar</button>
        <a href="/canil" className="btn-secondary">Cancelar</a>
      </div>
    </form>
  );
}
