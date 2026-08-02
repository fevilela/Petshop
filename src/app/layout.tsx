import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Petshop CRM",
  description: "Gestão de clientes, animais, agenda, vendas e financeiro",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
