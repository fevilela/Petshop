"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { TIPO_COBRANCA_LABEL } from "@/lib/cobranca-labels";

const OPCOES_COBRANCA: ("PIX" | "BOLETO" | "CARTAO_LINK")[] = ["PIX", "BOLETO", "CARTAO_LINK"];

type Mensalidade = { id: string; nome: string; preco: number; diaCobrancaPadrao: number | null };
type AssinaturaAtiva = {
  id: string;
  nomeMensalidade: string;
  valorMensal: number;
  diaCobranca: number;
  formaCobranca: string;
};

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
  /** Mensalidades ativas do catálogo, pra escolher qual assinar. */
  mensalidades: Mensalidade[];
  /**
   * Só em edição de um cliente que já é mensalista — quando presente, o
   * formulário mostra a assinatura atual (com botão de cancelar) em vez do
   * checkbox "é mensalista?" (trocar de mensalidade é cancelar a atual e
   * assinar de novo, não editar no meio — ver src/lib/assinatura.ts).
   */
  assinaturaAtiva?: AssinaturaAtiva | null;
  cancelarAssinaturaAction?: (formData: FormData) => Promise<void>;
};

export default function ClienteForm({
  action,
  defaultValues,
  mensalidades,
  assinaturaAtiva,
  cancelarAssinaturaAction,
}: Props) {
  const [mensalista, setMensalista] = useState(false);
  const [itemCatalogoId, setItemCatalogoId] = useState("");
  const mensalidadeEscolhida = mensalidades.find((m) => m.id === itemCatalogoId);

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
          <p className="text-xs text-gray-500 mt-1">Obrigatório se algum dia for gerar boleto pra este cliente.</p>
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

      <div className="border-t pt-4">
        <h2 className="font-medium text-gray-900 mb-2">Mensalista</h2>

        {assinaturaAtiva ? (
          <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-700">
              Assina <strong>{assinaturaAtiva.nomeMensalidade}</strong> ·{" "}
              {formatCurrency(assinaturaAtiva.valorMensal)}/mês · cobrança dia {assinaturaAtiva.diaCobranca} ·{" "}
              {TIPO_COBRANCA_LABEL[assinaturaAtiva.formaCobranca] ?? assinaturaAtiva.formaCobranca}
            </p>
            {cancelarAssinaturaAction && (
              <form action={cancelarAssinaturaAction}>
                <button type="submit" className="text-sm text-red-600 hover:underline">Cancelar assinatura</button>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="mensalista"
                checked={mensalista}
                onChange={(e) => setMensalista(e.target.checked)}
              />
              Este cliente é mensalista
            </label>

            {mensalista && (
              <div className="grid sm:grid-cols-3 gap-3 pl-6">
                <div className="sm:col-span-3">
                  <label className="label" htmlFor="itemCatalogoId">Mensalidade *</label>
                  <select
                    id="itemCatalogoId"
                    name="itemCatalogoId"
                    className="input"
                    value={itemCatalogoId}
                    onChange={(e) => setItemCatalogoId(e.target.value)}
                    required={mensalista}
                  >
                    <option value="">Selecione...</option>
                    {mensalidades.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome} — {formatCurrency(m.preco)}/mês</option>
                    ))}
                  </select>
                  {mensalidades.length === 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      Nenhuma mensalidade cadastrada ainda — crie uma em /catalogo primeiro.
                    </p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="valorMensal">Valor mensal (R$)</label>
                  <input
                    id="valorMensal"
                    name="valorMensal"
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder={mensalidadeEscolhida ? String(mensalidadeEscolhida.preco) : "Padrão da mensalidade"}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="diaCobranca">Dia de cobrança</label>
                  <input
                    id="diaCobranca"
                    name="diaCobranca"
                    type="number"
                    min={1}
                    max={28}
                    className="input"
                    placeholder={mensalidadeEscolhida?.diaCobrancaPadrao ? String(mensalidadeEscolhida.diaCobrancaPadrao) : "5"}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="label" htmlFor="formaCobranca">Forma de cobrança da fatura mensal</label>
                  <select id="formaCobranca" name="formaCobranca" className="input" defaultValue="PIX">
                    <option value="PIX">Pix</option>
                    <option value="BOLETO" disabled={!defaultValues?.documento}>
                      Boleto{!defaultValues?.documento ? " (precisa de CPF/CNPJ cadastrado)" : ""}
                    </option>
                    <option value="CARTAO_LINK">Link de pagamento</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Usada todo mês, inclusive na geração automática — dá pra trocar pontualmente ao gerar uma fatura específica.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Salvar</button>
        <a href="/clientes" className="btn-secondary">Cancelar</a>
      </div>
    </form>
  );
}
