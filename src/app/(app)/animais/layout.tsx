import { requireModulo } from "@/lib/modulos";

export default async function AnimaisLayout({ children }: { children: React.ReactNode }) {
  await requireModulo("animais");
  return <>{children}</>;
}
