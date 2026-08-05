"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionTenantPrisma } from "@/lib/session-tenant";
import { normalizePhoneE164 } from "@/lib/utils";
import { criarAssinatura } from "@/lib/assinatura";

const clienteSchema = z.object({
  nome: z.string().min(2, "Informe o nome completo"),
  telefone: z.string().min(8, "Informe um telefone/WhatsApp válido"),
  documento: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
  // Endereço estruturado (ver comentário no schema, model Cliente) — todos
  // opcionais aqui, só viram obrigatórios em código na hora de gerar um
  // boleto (ver src/lib/cliente-validacoes.ts).
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
});

function parseForm(formData: FormData) {
  return clienteSchema.parse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    documento: formData.get("documento") || undefined,
    email: formData.get("email") || undefined,
    endereco: formData.get("endereco") || undefined,
    observacoes: formData.get("observacoes") || undefined,
    cep: formData.get("cep") || undefined,
    logradouro: formData.get("logradouro") || undefined,
    numero: formData.get("numero") || undefined,
    complemento: formData.get("complemento") || undefined,
    bairro: formData.get("bairro") || undefined,
    cidade: formData.get("cidade") || undefined,
    uf: formData.get("uf") || undefined,
  });
}

/**
 * Lê os campos opcionais de "virar mensalista" do form do cliente (ver
 * ClienteForm.tsx) — presentes só quando o checkbox "é mensalista" está
 * marcado. `undefined` quando o cliente não está assinando nada por este
 * formulário (cliente comum, ou já é mensalista e o form mostrou o card de
 * assinatura ativa em vez do checkbox).
 */
function lerAssinaturaDoForm(formData: FormData): {
  itemCatalogoId: string;
  valorMensal?: number;
  diaCobranca?: number;
  formaCobranca?: "BOLETO" | "PIX" | "CARTAO_LINK";
} | undefined {
  if (formData.get("mensalista") !== "on") return undefined;
  const itemCatalogoId = formData.get("itemCatalogoId");
  if (!itemCatalogoId || typeof itemCatalogoId !== "string") return undefined;
  const valorMensal = formData.get("valorMensal");
  const diaCobranca = formData.get("diaCobranca");
  const formaCobrancaRaw = formData.get("formaCobranca");
  const formaCobranca =
    formaCobrancaRaw === "BOLETO" || formaCobrancaRaw === "PIX" || formaCobrancaRaw === "CARTAO_LINK"
      ? formaCobrancaRaw
      : undefined;
  return {
    itemCatalogoId,
    valorMensal: valorMensal ? Number(valorMensal) : undefined,
    diaCobranca: diaCobranca ? Number(diaCobranca) : undefined,
    formaCobranca,
  };
}

export async function createCliente(formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = parseForm(formData);

  // empresaId é passado explicitamente (mesmo o Client Extension já
  // injetando em runtime) porque o TIPO gerado pelo Prisma para `create`
  // exige o campo obrigatório do schema — a extension só relaxa isso em
  // runtime, não no tipo estático que o TypeScript checa no build.
  const cliente = await prisma.cliente.create({
    data: { ...data, empresaId, telefone: normalizePhoneE164(data.telefone) },
  });

  // Fora da criação do cliente de propósito: se isso falhar (ex: mensalidade
  // inválida), o cliente já foi criado com sucesso — não faz sentido
  // desfazer o cadastro por causa disso. Quem cadastrou pode tentar assinar
  // de novo em /clientes/[id]/editar. Erro vira a tela genérica (ver
  // src/app/(app)/error.tsx), não é silencioso.
  const dadosAssinatura = lerAssinaturaDoForm(formData);
  if (dadosAssinatura) {
    await criarAssinatura({ prisma, empresaId, clienteId: cliente.id, ...dadosAssinatura });
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateCliente(id: string, formData: FormData) {
  const { prisma, empresaId } = await getSessionTenantPrisma();
  const data = parseForm(formData);

  await prisma.cliente.update({
    where: { id },
    data: { ...data, telefone: normalizePhoneE164(data.telefone) },
  });

  const dadosAssinatura = lerAssinaturaDoForm(formData);
  if (dadosAssinatura) {
    await criarAssinatura({ prisma, empresaId, clienteId: id, ...dadosAssinatura });
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function deleteCliente(id: string) {
  const { prisma } = await getSessionTenantPrisma();
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
}
