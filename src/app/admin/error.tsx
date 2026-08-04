"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Mesma rede de segurança de `src/app/(app)/error.tsx`, só que pra área
 * `/admin/**` (usada só por você, SUPER_ADMIN) — rota separada no App
 * Router, então precisa do próprio `error.tsx` (um boundary não cobre a
 * outra árvore de rotas). Existe especialmente por causa dos pontos que
 * criptografam o token do Mercado Pago ao cadastrar/editar um
 * petshop-cliente (`admin/empresas/actions.ts`) — se `ENCRYPTION_KEY`
 * estiver ausente/inválida no servidor, cai aqui em vez do "Application
 * error" genérico do Next.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card p-6 max-w-md w-full text-center space-y-3">
        <p className="text-2xl">🐾💥</p>
        <h1 className="text-lg font-semibold text-gray-900">Algo deu errado</h1>
        <p className="text-sm text-gray-500">
          Não foi possível completar essa ação agora. Confira os logs do serviço no Render — o
          detalhe completo do erro está lá.
          {error.digest && (
            <>
              {" "}Código: <code className="text-xs">{error.digest}</code>
            </>
          )}
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <button type="button" onClick={() => reset()} className="btn-primary text-sm">
            Tentar novamente
          </button>
          <Link href="/admin/empresas" className="btn-secondary text-sm">
            Ir para Empresas
          </Link>
        </div>
      </div>
    </div>
  );
}
