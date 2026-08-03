import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import { trocarMinhaSenhaAction } from "./actions";

export default async function ContaPage({
  searchParams,
}: {
  searchParams: { trocada?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const voltarHref = session.user.role === "SUPER_ADMIN" ? "/admin/empresas" : "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm card p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-brand-700">🐾 Petshop CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Minha conta — {session.user.email}</p>
        </div>

        {searchParams.trocada === "1" && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            Senha alterada com sucesso.
          </p>
        )}

        <form action={trocarMinhaSenhaAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="senhaAtual">Senha atual</label>
            <input id="senhaAtual" name="senhaAtual" type="password" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="novaSenha">Nova senha</label>
            <input id="novaSenha" name="novaSenha" type="password" minLength={8} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="confirmarSenha">Confirmar nova senha</label>
            <input id="confirmarSenha" name="confirmarSenha" type="password" minLength={8} className="input" required />
          </div>
          <button type="submit" className="btn-primary w-full">Trocar senha</button>
        </form>

        <div className="flex items-center justify-between border-t pt-4">
          <a href={voltarHref} className="text-sm text-gray-600 hover:underline">Voltar</a>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
