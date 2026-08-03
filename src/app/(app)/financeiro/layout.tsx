import { requireModulo } from "@/lib/modulos";

export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  await requireModulo("financeiro");
  return <>{children}</>;
}
