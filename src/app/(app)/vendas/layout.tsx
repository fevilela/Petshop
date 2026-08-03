import { requireModulo } from "@/lib/modulos";

export default async function VendasLayout({ children }: { children: React.ReactNode }) {
  await requireModulo("vendas");
  return <>{children}</>;
}
