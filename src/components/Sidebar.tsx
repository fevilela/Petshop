"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Painel", icon: "🏠" },
  { href: "/clientes", label: "Clientes", icon: "👤" },
  { href: "/animais", label: "Animais", icon: "🐾" },
  { href: "/canil", label: "Canil / Hospedagem", icon: "🏠🐕" },
  { href: "/produtos-servicos", label: "Produtos & Serviços", icon: "🛍️" },
  { href: "/planos", label: "Planos (Mensalistas)", icon: "🔁" },
  { href: "/agenda", label: "Agenda", icon: "📅" },
  { href: "/vendas", label: "Vendas", icon: "💳" },
  { href: "/financeiro/contas-a-pagar", label: "Contas a Pagar", icon: "📤" },
  { href: "/financeiro/contas-a-receber", label: "Contas a Receber", icon: "📥" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="md:hidden fixed top-3 left-3 z-40 btn-secondary px-3 py-1.5"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir menu"
      >
        ☰
      </button>

      <aside
        className={`fixed md:static z-30 inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center px-5 border-b border-gray-200">
          <span className="text-lg font-semibold text-brand-700">🐾 Petshop CRM</span>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
