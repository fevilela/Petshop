"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button className="btn-secondary text-sm" onClick={() => signOut({ callbackUrl: "/login" })}>
      Sair
    </button>
  );
}
