import { requireModulo } from "@/lib/modulos";

export default async function CanilLayout({ children }: { children: React.ReactNode }) {
  await requireModulo("canil");
  return <>{children}</>;
}
