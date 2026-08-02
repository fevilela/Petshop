import { prisma } from "@/lib/prisma";
import AgendaForm from "@/components/AgendaForm";
import { createAgendamento } from "../actions";

export default async function NovoAgendamentoPage() {
  const [clientes, animais, servicos, canis] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.animal.findMany({ where: { ativo: true }, select: { id: true, nome: true, clienteId: true } }),
    prisma.servico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.canil.findMany({ orderBy: { identificador: "asc" }, select: { id: true, identificador: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Novo agendamento</h1>
      <AgendaForm action={createAgendamento} clientes={clientes} animais={animais} servicos={servicos} canis={canis} />
    </div>
  );
}
