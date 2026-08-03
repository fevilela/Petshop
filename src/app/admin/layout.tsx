import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
        <span className="text-lg font-semibold text-brand-700">🐾 Petshop CRM · Admin da plataforma</span>
        <div className="flex items-center gap-4">
          <Link href="/admin/empresas" className="text-sm text-gray-600 hover:underline">
            Petshops-clientes
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-6 max-w-5xl w-full mx-auto">{children}</main>
    </div>
  );
}
