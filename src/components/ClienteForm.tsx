"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { TIPO_COBRANCA_LABEL } from "@/lib/cobranca-labels";

const OPCOES_COBRANCA: ("PIX" | "BOLETO" | "CARTAO_LINK")[] = ["PIX", "BOLETO", "CARTAO_LINK"];

type Endereco = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

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
    cep?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    uf?: string | null;
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
  /** Troca a forma de cobrança PADRÃO da assinatura ativa (não é o override pontual de uma fatura — ver /planos/actions.ts). */
  atualizarFormaCobrancaAction?: (formData: FormData) => Promise<void>;
};

export default function ClienteForm({
  action,
  defaultValues,
  mensalidades,
  assinaturaAtiva,
  cancelarAssinaturaAction,
  atualizarFormaCobrancaAction,
}: Props) {
  const [mensalista, setMensalista] = useState(false);
  const [itemCatalogoId, setItemCatalogoId] = useState("");
  const mensalidadeEscolhida = mensalidades.find((m) => m.id === itemCatalogoId);

  const [documento, setDocumento] = useState(defaultValues?.documento ?? "");
  const [endereco, setEndereco] = useState<Endereco>({
    cep: defaultValues?.cep ?? "",
    logradouro: defaultValues?.logradouro ?? "",
    numero: defaultValues?.numero ?? "",
    complemento: defaultValues?.complemento ?? "",
    bairro: defaultValues?.bairro ?? "",
    cidade: defaultValues?.cidade ?? "",
    uf: defaultValues?.uf ?? "",
  });
  const [buscandoCep, setBuscandoCep] = useState(false);
  // Habilita a opção Boleto nos seletores de forma de cobrança em tempo
  // real, conforme o atendente vai preenchendo — não só com base no que já
  // estava salvo (defaultValues), senão a opção ficaria desabilitada até a
  // próxima vez que a página carregasse, mesmo com os dados já digitados
  // aqui embaixo.
  const podeBoleto = Boolean(
    documento && endereco.cep && endereco.logradouro && endereco.numero && endereco.bairro && endereco.cidade && endereco.uf
  );

  /** Autopreenche rua/bairro/cidade/UF a partir do CEP (ViaCEP, gratuito, sem chave). Falha de rede/CEP inválido: usuário preenche manualmente, sem bloquear o form. */
  async function buscarEnderecoPorCep(cepDigitado: string) {
    const cepLimpo = cepDigitado.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setEndereco((prev) => ({
        ...prev,
        logradouro: data.logradouro || prev.logradouro,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
      }));
    } catch {
      // Rede falhou ou ViaCEP fora do ar — sem problema, os campos continuam editáveis manualmente.
    } finally {
      setBuscandoCep(false);
    }
  }

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
          <input
            id="documento"
            name="documento"
            className="input"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Junto com o endereço abaixo, obrigatório se algum dia for gerar boleto pra este cliente.</p>
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
        <h2 className="font-medium text-gray-900 mb-1">Endereço para boleto</h2>
        <p className="text-xs text-gray-500 mb-3">
          Só necessário se algum dia for gerar boleto pra este cliente (venda avulsa ou mensalidade) — Pix e Link de
          pagamento não precisam disso. Digite o CEP que o resto preenche sozinho.
        </p>
        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label" htmlFor="cep">CEP</label>
            <input
              id="cep"
              name="cep"
              className="input"
              placeholder="00000-000"
              value={endereco.cep}
              onChange={(e) => setEndereco((prev) => ({ ...prev, cep: e.target.value }))}
              onBlur={(e) => buscarEnderecoPorCep(e.target.value)}
            />
            {buscandoCep && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
          </div>
          <div className="sm:col-span-3">
            <label className="label" htmlFor="logradouro">Rua</label>
            <input
              id="logradouro"
              name="logradouro"
              className="input"
              value={endereco.logradouro}
              onChange={(e) => setEndereco((prev) => ({ ...prev, logradouro: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="numero">Número</label>
            <input
              id="numero"
              name="numero"
              className="input"
              value={endereco.numero}
              onChange={(e) => setEndereco((prev) => ({ ...prev, numero: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="complemento">Complemento</label>
            <input
              id="complemento"
              name="complemento"
              className="input"
              value={endereco.complemento}
              onChange={(e) => setEndereco((prev) => ({ ...prev, complemento: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="bairro">Bairro</label>
            <input
              id="bairro"
              name="bairro"
              className="input"
              value={endereco.bairro}
              onChange={(e) => setEndereco((prev) => ({ ...prev, bairro: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="cidade">Cidade</label>
            <input
              id="cidade"
              name="cidade"
              className="input"
              value={endereco.cidade}
              onChange={(e) => setEndereco((prev) => ({ ...prev, cidade: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="uf">UF</label>
            <input
              id="uf"
              name="uf"
              className="input"
              maxLength={2}
              value={endereco.uf}
              onChange={(e) => setEndereco((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h2 className="font-medium text-gray-900 mb-2">Mensalista</h2>

        {assinaturaAtiva ? (
          <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-gray-700">
                Assina <strong>{assinaturaAtiva.nomeMensalidade}</strong> ·{" "}
                {formatCurrency(assinaturaAtiva.valorMensal)}/mês · cobrança dia {assinaturaAtiva.diaCobranca}
              </p>
              {cancelarAssinaturaAction && (
                <form action={cancelarAssinaturaAction}>
                  <button type="submit" className="text-sm text-red-600 hover:underline">Cancelar assinatura</button>
                </form>
              )}
            </div>
            {atualizarFormaCobrancaAction && (
              <form action={atualizarFormaCobrancaAction} className="flex items-center gap-2">
                <label className="text-xs text-gray-500" htmlFor="formaCobrancaAtual">Forma de cobrança:</label>
                <select
                  id="formaCobrancaAtual"
                  name="formaCobranca"
                  className="input text-xs py-1 w-auto"
                  defaultValue={assinaturaAtiva.formaCobranca}
                >
                  {OPCOES_COBRANCA.filter((op) => op !== "BOLETO" || podeBoleto).map((op) => (
                    <option key={op} value={op}>{TIPO_COBRANCA_LABEL[op]}</option>
                  ))}
                </select>
                <button type="submit" className="text-xs text-brand-700 hover:underline">Salvar</button>
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
                    <option value="BOLETO" disabled={!podeBoleto}>
                      Boleto{!podeBoleto ? " (precisa de CPF/CNPJ + endereço completo)" : ""}
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
