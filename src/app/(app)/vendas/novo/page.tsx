import { getSessionTenantPrisma } from "@/lib/session-tenant";
import VendaForm from "@/components/VendaForm";
import { createVenda } from "../actions";

export default async function NovaVendaPage() {
  const { prisma } = await getSessionTenantPrisma();
  const [clientes, animais, produtos, servicos, assinaturas] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.animal.findMany({ where: { ativo: true }, select: { id: true, nome: true, clienteId: true } }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.servico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.assinatura.findMany({
      where: { status: "ATIVA" },
      include: { plano: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Nova venda</h1>
      <VendaForm
        action={createVenda}
        clientes={clientes}
        animais={animais}
        produtos={produtos.map((p) => ({ id: p.id, nome: p.nome, preco: Number(p.preco) }))}
        servicos={servicos.map((s) => ({ id: s.id, nome: s.nome, preco: Number(s.preco) }))}
        assinaturas={assinaturas.map((a) => ({ id: a.id, clienteId: a.clienteId, planoNome: a.plano.nome }))}
      />
    </div>
  );
}
