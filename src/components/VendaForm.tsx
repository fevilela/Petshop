"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Cliente = { id: string; nome: string };
type Animal = { id: string; nome: string; clienteId: string };
type Catalogo = { id: string; nome: string; preco: number };
type Assinatura = { id: string; clienteId: string; planoNome: string };

type ItemCarrinho = {
  key: string;
  tipo: "PRODUTO" | "SERVICO";
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
};

const FORMAS_PAGAMENTO: { value: string; label: string }[] = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX_MANUAL", label: "Pix (manual, fora do sistema)" },
  { value: "CARTAO_MANUAL", label: "Cartão (maquininha própria)" },
  { value: "PIX_MERCADOPAGO", label: "Pix via Mercado Pago (gera QR Code)" },
  { value: "BOLETO", label: "Boleto (Mercado Pago)" },
  { value: "CARTAO_LINK", label: "Link de pagamento (Mercado Pago)" },
  { value: "MENSALISTA", label: "Mensalista (debitar do plano)" },
  { value: "A_FATURAR", label: "Lançar na fatura mensal (mensalista, cobra depois)" },
];

const FORMAS_QUE_EXIGEM_ASSINATURA = new Set(["MENSALISTA", "A_FATURAR"]);

export default function VendaForm({
  action,
  clientes,
  animais,
  produtos,
  servicos,
  assinaturas,
}: {
  action: (formData: FormData) => Promise<void>;
  clientes: Cliente[];
  animais: Animal[];
  produtos: Catalogo[];
  servicos: Catalogo[];
  assinaturas: Assinatura[];
}) {
  const [clienteId, setClienteId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("DINHEIRO");
  const [assinaturaId, setAssinaturaId] = useState("");
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [catalogoSelecionado, setCatalogoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState(1);

  const animaisDoCliente = useMemo(() => animais.filter((a) => a.clienteId === clienteId), [animais, clienteId]);
  const assinaturasDoCliente = useMemo(
    () => assinaturas.filter((a) => a.clienteId === clienteId),
    [assinaturas, clienteId]
  );

  const total = itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);

  function adicionarItem() {
    if (!catalogoSelecionado) return;
    const [tipo, id] = catalogoSelecionado.split(":") as ["PRODUTO" | "SERVICO", string];
    const catalogo = (tipo === "PRODUTO" ? produtos : servicos).find((c) => c.id === id);
    if (!catalogo) return;

    setItens((prev) => [
      ...prev,
      { key: `${tipo}-${id}-${Date.now()}`, tipo, id, nome: catalogo.nome, preco: catalogo.preco, quantidade },
    ]);
    setCatalogoSelecionado("");
    setQuantidade(1);
  }

  function removerItem(key: string) {
    setItens((prev) => prev.filter((i) => i.key !== key));
  }

  const itensJson = JSON.stringify(
    itens.map((i) => ({ tipo: i.tipo, id: i.id, quantidade: i.quantidade }))
  );

  return (
    <form action={action} className="space-y-6">
      <div className="card p-6 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="clienteId">Cliente *</label>
          <select
            id="clienteId"
            name="clienteId"
            className="input"
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value);
              setAnimalId("");
              setAssinaturaId("");
            }}
            required
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="animalId">Animal (opcional)</label>
          <select id="animalId" name="animalId" className="input" value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
            <option value="">—</option>
            {animaisDoCliente.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="formaPagamento">Forma de pagamento *</label>
          <select
            id="formaPagamento"
            name="formaPagamento"
            className="input"
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
            required
          >
            {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        {FORMAS_QUE_EXIGEM_ASSINATURA.has(formaPagamento) && (
          <div>
            <label className="label" htmlFor="assinaturaId">Assinatura do cliente *</label>
            <select
              id="assinaturaId"
              name="assinaturaId"
              className="input"
              value={assinaturaId}
              onChange={(e) => setAssinaturaId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {assinaturasDoCliente.map((a) => <option key={a.id} value={a.id}>{a.planoNome}</option>)}
            </select>
            {clienteId && assinaturasDoCliente.length === 0 && (
              <p className="text-xs text-amber-700 mt-1">Este cliente não possui assinatura ativa.</p>
            )}
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="label" htmlFor="observacoes">Observações</label>
          <textarea id="observacoes" name="observacoes" className="input" rows={2} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-medium text-gray-900 mb-3">Itens da venda</h2>

        <div className="flex flex-wrap gap-2 items-end mb-4">
          <div className="flex-1 min-w-[220px]">
            <label className="label">Produto ou serviço</label>
            <select className="input" value={catalogoSelecionado} onChange={(e) => setCatalogoSelecionado(e.target.value)}>
              <option value="">Selecione...</option>
              <optgroup label="Produtos">
                {produtos.map((p) => (
                  <option key={p.id} value={`PRODUTO:${p.id}`}>{p.nome} — {formatCurrency(p.preco)}</option>
                ))}
              </optgroup>
              <optgroup label="Serviços">
                {servicos.map((s) => (
                  <option key={s.id} value={`SERVICO:${s.id}`}>{s.nome} — {formatCurrency(s.preco)}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="w-24">
            <label className="label">Qtd.</label>
            <input type="number" min={1} className="input" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
          </div>
          <button type="button" className="btn-secondary" onClick={adicionarItem}>+ Adicionar</button>
        </div>

        <table className="table-base">
          <thead><tr><th>Item</th><th>Qtd.</th><th>Preço</th><th>Subtotal</th><th></th></tr></thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.key}>
                <td>{i.nome} <span className="text-gray-400">({i.tipo === "PRODUTO" ? "produto" : "serviço"})</span></td>
                <td>{i.quantidade}</td>
                <td>{formatCurrency(i.preco)}</td>
                <td>{formatCurrency(i.preco * i.quantidade)}</td>
                <td className="text-right">
                  <button type="button" className="text-red-600 hover:underline text-sm" onClick={() => removerItem(i.key)}>Remover</button>
                </td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-500 py-4">Nenhum item adicionado.</td></tr>
            )}
          </tbody>
        </table>

        <div className="text-right mt-3 font-semibold text-lg">Total: {formatCurrency(total)}</div>
      </div>

      <input type="hidden" name="itensJson" value={itensJson} />

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={itens.length === 0}>Finalizar venda</button>
        <a href="/vendas" className="btn-secondary">Cancelar</a>
      </div>
    </form>
  );
}
