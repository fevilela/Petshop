import { requireModulo } from "@/lib/modulos";

export default async function PlanosLayout({ children }: { children: React.ReactNode }) {
  await requireModulo("planos");
  return <>{children}</>;
}
