import { requireModulo } from "@/lib/modulos";

/** Mesmo módulo de antes ("produtos_servicos") — só o cadastro (Produto/Serviço/Mensalidade) mudou de forma, não a chave do módulo que controla acesso. */
export default async function CatalogoLayout({ children }: { children: React.ReactNode }) {
  await requireModulo("produtos_servicos");
  return <>{children}</>;
}
