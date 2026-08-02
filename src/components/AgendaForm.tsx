"use client";

import { useMemo, useState } from "react";

type Cliente = { id: string; nome: string };
type Animal = { id: string; nome: string; clienteId: string };
type Servico = { id: string; nome: string };
type Canil = { id: string; identificador: string };

export default function AgendaForm({
  action,
  clientes,
  animais,
  servicos,
  canis,
}: {
  action: (formData: FormData) => Promise<void>;
  clientes: Cliente[];
  animais: Animal[];
  servicos: Servico[];
  canis: Canil[];
}) {
  const [clienteId, setClienteId] = useState("");
  const animaisDoCliente = useMemo(() => animais.filter((a) => a.clienteId === clienteId), [animais, clienteId]);

  return (
    <form action={action} className="card p-6 space-y-4 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="clienteId">Cliente *</label>
          <select id="clienteId" name="clienteId" className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
            <option value="">Selecione...</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="animalId">Animal *</label>
          <select id="animalId" name="animalId" className="input" required defaultValue="">
            <option value="">Selecione...</option>
            {animaisDoCliente.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="servicoId">Serviço</label>
          <select id="servicoId" name="servicoId" className="input">
            <option value="">—</option>
            {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="canilId">Canil (para hospedagem)</label>
          <select id="canilId" name="canilId" className="input">
            <option value="">—</option>
            {canis.map((c) => <option key={c.id} value={c.id}>{c.identificador}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="dataHoraInicio">Data e hora de início *</label>
          <input id="dataHoraInicio" name="dataHoraInicio" type="datetime-local" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="dataHoraFim">Data e hora de término</label>
          <input id="dataHoraFim" name="dataHoraFim" type="datetime-local" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="observacoes">Observações</label>
          <textarea id="observacoes" name="observacoes" className="input" rows={2} />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary">Agendar</button>
        <a href="/agenda" className="btn-secondary">Cancelar</a>
      </div>
    </form>
  );
}
