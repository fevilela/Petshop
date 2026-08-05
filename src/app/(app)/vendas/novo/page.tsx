import { getSessionTenantPrisma } from "@/lib/session-tenant";
import VendaForm from "@/components/VendaForm";
import { createVenda } from "../actions";

export default async function NovaVendaPage() {
  const { prisma } = await getSessionTenantPrisma();
  const [clientes, animais, catalogo, assinaturas] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, documento: true } }),
    prisma.animal.findMany({ where: { ativo: true }, select: { id: true, nome: true, clienteId: true } }),
    prisma.itemCatalogo.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.assinatura.findMany({
      where: { status: "ATIVA" },
      include: { itemCatalogo: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Nova venda</h1>
      <VendaForm
        action={createVenda}
        clientes={clientes}
        animais={animais}
        catalogo={catalogo.map((c) => ({ id: c.id, tipo: c.tipo, nome: c.nome, preco: Number(c.preco) }))}
        assinaturas={assinaturas.map((a) => ({ id: a.id, clienteId: a.clienteId, nomeMensalidade: a.itemCatalogo.nome }))}
      />
    </div>
  );
}
