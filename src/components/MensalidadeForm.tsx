type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    nome?: string;
    descricao?: string | null;
    preco?: unknown;
    diaCobrancaPadrao?: number | null;
  };
};

export default function MensalidadeForm({ action, defaultValues }: Props) {
  return (
    <form action={action} className="card p-6 space-y-4 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nome">Nome *</label>
          <input id="nome" name="nome" className="input" placeholder="Banho Mensal 4x, Plano Completo..." defaultValue={defaultValues?.nome} required />
        </div>
        <div>
          <label className="label" htmlFor="preco">Valor mensal (R$) *</label>
          <input id="preco" name="preco" type="number" step="0.01" className="input" defaultValue={defaultValues?.preco ? String(defaultValues.preco) : ""} required />
        </div>
        <div>
          <label className="label" htmlFor="diaCobrancaPadrao">Dia de cobrança padrão</label>
          <input
            id="diaCobrancaPadrao"
            name="diaCobrancaPadrao"
            type="number"
            min={1}
            max={28}
            className="input"
            defaultValue={defaultValues?.diaCobrancaPadrao ?? 5}
          />
          <p className="text-xs text-gray-500 mt-1">Pode ser customizado por assinante ao assinar.</p>
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
