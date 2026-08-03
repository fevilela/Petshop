"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export default function Topbar({ userName }: { userName: string }) {
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-end gap-4 px-4 md:px-6">
      <span className="text-sm text-gray-600 hidden sm:inline">Olá, {userName}</span>
      <Link href="/conta" className="text-sm text-gray-600 hover:underline">
        Minha conta
      </Link>
      <button className="btn-secondary text-sm" onClick={() => signOut({ callbackUrl: "/login" })}>
        Sair
      </button>
    </header>
  );
}
