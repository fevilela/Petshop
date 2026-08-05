"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { TIPO_COBRANCA_LABEL } from "@/lib/cobranca-labels";

const OPCOES_COBRANCA: ("PIX" | "BOLETO" | "CARTAO_LINK")[] = ["PIX", "BOLETO", "CARTAO_LINK"];

type Cliente = { id: string; nome: string; documento: string | null };
type Animal = { id: string; nome: string; clienteId: string };
type TipoCatalogo = "PRODUTO" | "SERVICO" | "MENSALIDADE";
type ItemCatalogo = { id: string; tipo: TipoCatalogo; nome: string; preco: number };
type Assinatura = { id: string; clienteId: string; nomeMensalidade: string };

type ItemCarrinho = {
  key: string;
  itemCatalogoId: string;
  tipo: TipoCatalogo;
  nome: string;
  preco: number;
  quantidade: number;
};

// MENSALISTA (a antiga forma "incluso no plano, grátis") foi retirada daqui
// de propósito — o conceito foi removido (ver prisma/schema.prisma). O
// enum no banco continua tendo esse valor só por causa de vendas antigas
// já gravadas; a tela não oferece mais essa opção.
const FORMAS_PAGAMENTO: { value: string; label: string }[] = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX_MANUAL", label: "Pix (manual, fora do sistema)" },
  { value: "CARTAO_MANUAL", label: "Cartão (maquininha própria)" },
  { value: "PIX_MERCADOPAGO", label: "Pix via Mercado Pago (gera QR Code)" },
  { value: "BOLETO", label: "Boleto (Mercado Pago)" },
  { value: "CARTAO_LINK", label: "Link de pagamento (Mercado Pago)" },
  { value: "A_FATURAR", label: "Mensalista (cobra na fatura mensal)" },
];

const TIPO_LABEL: Record<TipoCatalogo, string> = {
  PRODUTO: "produto",
  SERVICO: "serviço",
  MENSALIDADE: "mensalidade",
};

export default function VendaForm({
  action,
  clientes,
  animais,
  catalogo,
  assinaturas,
}: {
  action: (formData: FormData) => Promise<void>;
  clientes: Cliente[];
  animais: Animal[];
  catalogo: ItemCatalogo[];
  assinaturas: Assinatura[];
}) {
  const [clienteId, setClienteId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("DINHEIRO");
  const [assinaturaId, setAssinaturaId] = useState("");
  const [formaCobrancaMensalidade, setFormaCobrancaMensalidade] = useState("PIX");
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [catalogoSelecionado, setCatalogoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [avisoCarrinho, setAvisoCarrinho] = useState("");

  const produtos = useMemo(() => catalogo.filter((c) => c.tipo === "PRODUTO"), [catalogo]);
  const servicos = useMemo(() => catalogo.filter((c) => c.tipo === "SERVICO"), [catalogo]);
  const mensalidades = useMemo(() => catalogo.filter((c) => c.tipo === "MENSALIDADE"), [catalogo]);

  const animaisDoCliente = useMemo(() => animais.filter((a) => a.clienteId === clienteId), [animais, clienteId]);
  const assinaturasDoCliente = useMemo(
    () => assinaturas.filter((a) => a.clienteId === clienteId),
    [assinaturas, clienteId]
  );
  const clienteJaEhMensalista = assinaturasDoCliente.length > 0;
  const clienteSelecionado = useMemo(() => clientes.find((c) => c.id === clienteId), [clientes, clienteId]);
  const carrinhoTemMensalidade = itens.some((i) => i.tipo === "MENSALIDADE");

  // Mensalidade não entra no total a pagar AGORA — vira Assinatura e a
  // primeira cobrança dela sai na próxima fatura mensal, junto com as
  // demais (ver src/lib/assinatura.ts e src/lib/faturamento.ts).
  const totalPagar = itens.filter((i) => i.tipo !== "MENSALIDADE").reduce((acc, i) => acc + i.preco * i.quantidade, 0);
  const itemMensalidade = itens.find((i) => i.tipo === "MENSALIDADE");

  function adicionarItem() {
    setAvisoCarrinho("");
    if (!catalogoSelecionado) return;
    const [tipo, id] = catalogoSelecionado.split(":") as [TipoCatalogo, string];
    const item = catalogo.find((c) => c.id === id && c.tipo === tipo);
    if (!item) return;

    if (tipo === "MENSALIDADE") {
      if (carrinhoTemMensalidade) {
        setAvisoCarrinho("Só dá pra adicionar uma mensalidade por venda.");
        return;
      }
      if (clienteJaEhMensalista) {
        setAvisoCarrinho("Este cliente já é mensalista — cancele a assinatura atual antes de assinar outra.");
        return;
      }
    }

    setItens((prev) => [
      ...prev,
      {
        key: `${tipo}-${id}-${Date.now()}`,
        itemCatalogoId: id,
        tipo,
        nome: item.nome,
        preco: item.preco,
        quantidade: tipo === "MENSALIDADE" ? 1 : quantidade,
      },
    ]);
    setCatalogoSelecionado("");
    setQuantidade(1);
  }

  function removerItem(key: string) {
    setItens((prev) => prev.filter((i) => i.key !== key));
  }

  const itensJson = JSON.stringify(
    itens.map((i) => ({ itemCatalogoId: i.itemCatalogoId, quantidade: i.quantidade }))
  );

  const precisaAssinaturaExistente = formaPagamento === "A_FATURAR";

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
              setFormaCobrancaMensalidade("PIX");
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
          {totalPagar === 0 && itens.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Nada a cobrar nesta venda (só mensalidade) — a forma de pagamento aqui não tem efeito.
            </p>
          )}
        </div>

        {precisaAssinaturaExistente && (
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
              {assinaturasDoCliente.map((a) => <option key={a.id} value={a.id}>{a.nomeMensalidade}</option>)}
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

        <div className="flex flex-wrap gap-2 items-end mb-2">
          <div className="flex-1 min-w-[220px]">
            <label className="label">Produto, serviço ou mensalidade</label>
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
              <optgroup label="Mensalidades (assina o cliente)">
                {mensalidades.map((m) => (
                  <option key={m.id} value={`MENSALIDADE:${m.id}`}>{m.nome} — {formatCurrency(m.preco)}/mês</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="w-24">
            <label className="label">Qtd.</label>
            <input
              type="number"
              min={1}
              className="input"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              disabled={catalogoSelecionado.startsWith("MENSALIDADE:")}
            />
          </div>
          <button type="button" className="btn-secondary" onClick={adicionarItem}>+ Adicionar</button>
        </div>

        {avisoCarrinho && <p className="text-sm text-amber-700 mb-3">{avisoCarrinho}</p>}

        <table className="table-base">
          <thead><tr><th>Item</th><th>Qtd.</th><th>Preço</th><th>Subtotal</th><th></th></tr></thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.key}>
                <td>{i.nome} <span className="text-gray-400">({TIPO_LABEL[i.tipo]})</span></td>
                <td>{i.quantidade}</td>
                <td>{formatCurrency(i.preco)}</td>
                <td>
                  {formatCurrency(i.preco * i.quantidade)}
                  {i.tipo === "MENSALIDADE" && <span className="text-xs text-gray-400"> (na fatura)</span>}
                </td>
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

        {itemMensalidade && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-gray-500">
              "{itemMensalidade.nome}" assina o cliente à mensalidade — a primeira cobrança
              ({formatCurrency(itemMensalidade.preco)}) entra na próxima fatura mensal, não nesta venda.
            </p>
            <div className="max-w-xs">
              <label className="label" htmlFor="formaCobrancaMensalidade">Forma de cobrança da mensalidade</label>
              <select
                id="formaCobrancaMensalidade"
                name="formaCobrancaMensalidade"
                className="input"
                value={formaCobrancaMensalidade}
                onChange={(e) => setFormaCobrancaMensalidade(e.target.value)}
              >
                {OPCOES_COBRANCA.filter((op) => op !== "BOLETO" || clienteSelecionado?.documento).map((op) => (
                  <option key={op} value={op}>{TIPO_COBRANCA_LABEL[op]}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Usada todo mês nas próximas faturas — dá pra trocar pontualmente ao gerar uma fatura específica.
              </p>
            </div>
          </div>
        )}
        <div className="text-right mt-3 font-semibold text-lg">Total a pagar agora: {formatCurrency(totalPagar)}</div>
      </div>

      <input type="hidden" name="itensJson" value={itensJson} />

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={itens.length === 0}>Finalizar venda</button>
        <a href="/vendas" className="btn-secondary">Cancelar</a>
      </div>
    </form>
  );
}
