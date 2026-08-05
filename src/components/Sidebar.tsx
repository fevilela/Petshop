"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ModuloKey } from "@/lib/modulos";

type NavLink = { type: "link"; href: string; label: string; icon: string; modulo?: ModuloKey };
type NavGroup = {
  type: "group";
  label: string;
  icon: string;
  items: { href: string; label: string; modulo?: ModuloKey }[];
};
type NavItem = NavLink | NavGroup;

// Itens sem `modulo` (Painel, Clientes, Configurações) ficam sempre visíveis.
// Os demais só aparecem se o módulo estiver no conjunto efetivo do usuário
// (empresa habilitou E, se for atendente, ele não foi restringido) — ver
// src/lib/modulos.ts. Esconder aqui é só a camada de UX; a proteção de
// verdade contra acesso direto por URL está nos layout.tsx de cada módulo.
const NAV: NavItem[] = [
  { type: "link", href: "/", label: "Painel", icon: "🏠" },
  {
    type: "group",
    label: "Cadastros",
    icon: "📋",
    items: [
      { href: "/clientes", label: "Clientes" },
      { href: "/animais", label: "Animais", modulo: "animais" },
      { href: "/canil", label: "Canil / Hospedagem", modulo: "canil" },
      { href: "/catalogo", label: "Catálogo", modulo: "produtos_servicos" },
      { href: "/planos/faturamento", label: "Faturamento mensal", modulo: "planos" },
    ],
  },
  { type: "link", href: "/agenda", label: "Agenda", icon: "📅", modulo: "agenda" },
  { type: "link", href: "/vendas", label: "Vendas", icon: "💳", modulo: "vendas" },
  {
    type: "group",
    label: "Financeiro",
    icon: "💰",
    items: [
      { href: "/financeiro/contas-a-pagar", label: "Contas a Pagar", modulo: "financeiro" },
      { href: "/financeiro/contas-a-receber", label: "Contas a Receber", modulo: "financeiro" },
    ],
  },
  { type: "link", href: "/configuracoes", label: "Configurações", icon: "⚙️" },
];

function isActiveHref(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function permitido(modulo: ModuloKey | undefined, modulosPermitidos: ModuloKey[]) {
  return !modulo || modulosPermitidos.includes(modulo);
}

function navFiltrado(modulosPermitidos: ModuloKey[]): NavItem[] {
  return NAV.map((item) => {
    if (item.type === "link") return item;
    return { ...item, items: item.items.filter((sub) => permitido(sub.modulo, modulosPermitidos)) };
  }).filter((item) => {
    if (item.type === "link") return permitido(item.modulo, modulosPermitidos);
    return item.items.length > 0;
  });
}

/** Nome dos grupos que contêm a rota ativa (para já abrir o submenu certo ao navegar). */
function groupsComRotaAtiva(pathname: string | null, nav: NavItem[]): string[] {
  return nav.filter(
    (item): item is NavGroup => item.type === "group" && item.items.some((sub) => isActiveHref(pathname, sub.href))
  ).map((g) => g.label);
}

export default function Sidebar({ modulosPermitidos }: { modulosPermitidos: ModuloKey[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = navFiltrado(modulosPermitidos);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => groupsComRotaAtiva(pathname, nav));

  // Se o usuário navegar (via link direto, botão voltar etc.) para dentro de um
  // grupo que ainda não estava aberto, abrimos automaticamente — sem fechar os
  // que o usuário já tinha aberto manualmente.
  useEffect(() => {
    const ativos = groupsComRotaAtiva(pathname, nav);
    setExpandedGroups((prev) => Array.from(new Set([...prev, ...ativos])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(label: string) {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  }

  return (
    <>
      <button
        className="md:hidden fixed top-3 left-3 z-40 btn-secondary px-3 py-1.5"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
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
        <nav className="p-3 space-y-1 overflow-y-auto" aria-label="Navegação principal">
          {nav.map((item) => {
            if (item.type === "link") {
              const active = isActiveHref(pathname, item.href);
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
            }

            const expanded = expandedGroups.includes(item.label);
            const groupAtivo = item.items.some((sub) => isActiveHref(pathname, sub.href));
            const panelId = `nav-group-${item.label.toLowerCase().replace(/\s+/g, "-")}`;

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.label)}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
                    groupAtivo ? "text-brand-700" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span
                    aria-hidden
                    className={`text-xs transition-transform ${expanded ? "rotate-90" : ""}`}
                  >
                    ▶
                  </span>
                </button>

                {expanded && (
                  <div id={panelId} className="mt-1 space-y-1 pl-4 border-l border-gray-100 ml-4">
                    {item.items.map((sub) => {
                      const active = isActiveHref(pathname, sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setOpen(false)}
                          className={`block rounded-md px-3 py-1.5 text-sm ${
                            active ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
