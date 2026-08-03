import { controlPrisma } from "@/lib/control-prisma";
import { definirSenhaAction } from "./actions";

export default async function ConvitePage({ params }: { params: { token: string } }) {
  const convite = await controlPrisma.conviteUsuario.findUnique({
    where: { token: params.token },
    include: { usuario: true },
  });

  const invalido = !convite || !!convite.usadoEm || convite.expiraEm < new Date();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-brand-700">🐾 Petshop CRM</h1>
        </div>

        {invalido ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            Este link de convite é inválido ou já expirou. Peça para gerarem um novo.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Olá, {convite.usuario.nome}. Crie sua senha de acesso:
            </p>
            <form action={definirSenhaAction.bind(null, params.token)} className="space-y-4">
              <div>
                <label className="label" htmlFor="senha">Nova senha</label>
                <input id="senha" name="senha" type="password" minLength={8} className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="confirmarSenha">Confirmar senha</label>
                <input id="confirmarSenha" name="confirmarSenha" type="password" minLength={8} className="input" required />
              </div>
              <button type="submit" className="btn-primary w-full">Criar senha e acessar</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
