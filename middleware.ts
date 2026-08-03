import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Além de exigir login (comportamento padrão do withAuth), separamos duas
 * áreas:
 *  - /admin/**   -> só SUPER_ADMIN (Fernanda, dona da plataforma)
 *  - qualquer outra rota do CRM -> só usuários de uma Empresa (EMPRESA_ADMIN
 *    ou EMPRESA_ATENDENTE), nunca o SUPER_ADMIN (ele não opera um petshop).
 */
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const isSuperAdmin = token?.role === "SUPER_ADMIN";
    const isRotaAdmin = pathname.startsWith("/admin");
    // /conta (trocar a própria senha) é neutra: qualquer papel logado acessa,
    // sem o redirecionamento automático de SUPER_ADMIN <-> resto do sistema.
    const isRotaNeutra = pathname.startsWith("/conta");

    if (isRotaNeutra) return NextResponse.next();
    if (isRotaAdmin && !isSuperAdmin) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!isRotaAdmin && isSuperAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

// Protege todas as rotas, exceto login, convite (define senha), api de auth,
// webhooks e assets estáticos.
export const config = {
  matcher: [
    "/((?!login|convite|api/auth|api/webhooks|_next/static|_next/image|favicon.ico).*)",
  ],
};
