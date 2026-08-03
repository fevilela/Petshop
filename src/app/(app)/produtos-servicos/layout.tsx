import { requireModulo } from "@/lib/modulos";

export default async function ProdutosServicosLayout({ children }: { children: React.ReactNode }) {
  await requireModulo("produtos_servicos");
  return <>{children}</>;
}
