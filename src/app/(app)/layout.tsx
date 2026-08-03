import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getModulosEfetivosSessao } from "@/lib/modulos";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const modulosPermitidos = await getModulosEfetivosSessao();

  return (
    <div className="min-h-screen flex">
      <Sidebar modulosPermitidos={modulosPermitidos} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userName={session.user.name ?? session.user.email ?? "Usuário"} />
        <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
