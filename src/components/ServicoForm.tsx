type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    nome?: string;
    categoria?: string | null;
    descricao?: string | null;
    preco?: unknown;
    duracaoMinutos?: number | null;
  };
};

export default function ServicoForm({ action, defaultValues }: Props) {
  return (
    <form action={action} className="card p-6 space-y-4 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nome">Nome *</label>
          <input id="nome" name="nome" className="input" placeholder="Banho, Tosa, Consulta..." defaultValue={defaultValues?.nome} required />
        </div>
        <div>
          <label className="label" htmlFor="categoria">Categoria</label>
          <input id="categoria" name="categoria" className="input" defaultValue={defaultValues?.categoria ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="duracaoMinutos">Duração (min)</label>
          <input id="duracaoMinutos" name="duracaoMinutos" type="number" className="input" defaultValue={defaultValues?.duracaoMinutos ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="preco">Preço (R$) *</label>
          <input id="preco" name="preco" type="number" step="0.01" className="input" defaultValue={defaultValues?.preco ? String(defaultValues.preco) : ""} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="descricao">Descrição</label>
          <textarea id="descricao" name="descricao" className="input" rows={2} defaultValue={defaultValues?.descricao ?? ""} />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Salvar</button>
        <a href="/catalogo" className="btn-secondary">Cancelar</a>
      </div>
    </form>
  );
}
