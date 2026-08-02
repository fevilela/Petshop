type Cliente = { id: string; nome: string };

type Props = {
  action: (formData: FormData) => Promise<void>;
  mostrarFornecedor?: boolean;
  mostrarCategoria?: boolean;
  clientes?: Cliente[];
  defaultValues?: {
    descricao?: string;
    fornecedor?: string | null;
    categoria?: string | null;
    clienteId?: string | null;
    valor?: unknown;
    dataVencimento?: Date | string;
    observacoes?: string | null;
  };
  cancelHref: string;
};

export default function ContaForm({
  action,
  mostrarFornecedor = true,
  mostrarCategoria = true,
  clientes,
  defaultValues,
  cancelHref,
}: Props) {
  const vencimento = defaultValues?.dataVencimento
    ? new Date(defaultValues.dataVencimento).toISOString().slice(0, 10)
    : "";

  return (
    <form action={action} className="card p-6 space-y-4 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="descricao">Descrição *</label>
          <input id="descricao" name="descricao" className="input" defaultValue={defaultValues?.descricao} required />
        </div>
        {mostrarFornecedor && (
          <div>
            <label className="label" htmlFor="fornecedor">Fornecedor</label>
            <input id="fornecedor" name="fornecedor" className="input" defaultValue={defaultValues?.fornecedor ?? ""} />
          </div>
        )}
        {clientes && (
          <div>
            <label className="label" htmlFor="clienteId">Cliente</label>
            <select id="clienteId" name="clienteId" className="input" defaultValue={defaultValues?.clienteId ?? ""}>
              <option value="">—</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}
        {mostrarCategoria && (
          <div>
            <label className="label" htmlFor="categoria">Categoria</label>
            <input id="categoria" name="categoria" className="input" defaultValue={defaultValues?.categoria ?? ""} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="valor">Valor (R$) *</label>
          <input id="valor" name="valor" type="number" step="0.01" className="input" defaultValue={defaultValues?.valor ? String(defaultValues.valor) : ""} required />
        </div>
        <div>
          <label className="label" htmlFor="dataVencimento">Vencimento *</label>
          <input id="dataVencimento" name="dataVencimento" type="date" className="input" defaultValue={vencimento} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="observacoes">Observações</label>
          <textarea id="observacoes" name="observacoes" className="input" rows={2} defaultValue={defaultValues?.observacoes ?? ""} />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Salvar</button>
        <a href={cancelHref} className="btn-secondary">Cancelar</a>
      </div>
    </form>
  );
}
