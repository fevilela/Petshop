export { default } from "next-auth/middleware";

// Protege todas as rotas do CRM, exceto login, api de auth, webhooks e assets estáticos.
export const config = {
  matcher: [
    "/((?!login|api/auth|api/webhooks|_next/static|_next/image|favicon.ico).*)",
  ],
};
