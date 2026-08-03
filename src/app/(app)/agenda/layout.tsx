import { requireModulo } from "@/lib/modulos";

export default async function AgendaLayout({ children }: { children: React.ReactNode }) {
  await requireModulo("agenda");
  return <>{children}</>;
}
