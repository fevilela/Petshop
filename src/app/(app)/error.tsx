"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Rede de segurança pra qualquer erro não tratado nas telas logadas
 * (`src/app/(app)/**`) — sem isso, o Next mostra a tela genérica
 * "Application error: a server-side exception has occurred", sem marca,
 * sem ação nenhuma além de recarregar a página inteira.
 *
 * Continua sendo um sintoma de bug (o ideal é sempre tratar o erro na
 * origem — ver `configuracoes/actions.ts` para o padrão preferido de
 * devolver `{ error }` em vez de lançar), mas garante que uma falha
 * inesperada (banco fora do ar, env var faltando, etc.) não deixa a pessoa
 * travada numa tela em branco sem saber o que fazer.
 *
 * NÃO exibimos `error.message`: em produção o Next já redige mensagens de
 * erro do servidor por segurança, mas evitamos depender disso — a pessoa
 * só vê o texto genérico abaixo; o detalhe completo vai pro log do
 * servidor (Render → Logs), correlacionável pelo `error.digest`.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card p-6 max-w-md w-full text-center space-y-3">
        <p className="text-2xl">🐾💥</p>
        <h1 className="text-lg font-semibold text-gray-900">Algo deu errado</h1>
        <p className="text-sm text-gray-500">
          Não foi possível completar essa ação agora. Tente de novo — se continuar acontecendo,
          contate o suporte informando o horário.
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
          <Link href="/" className="btn-secondary text-sm">
            Ir para o Painel
          </Link>
        </div>
      </div>
    </div>
  );
}
