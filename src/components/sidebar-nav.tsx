"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/dashboard/documents", label: "Documentos" },
  { href: "/dashboard/chat", label: "Chat" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-3 mt-4 flex flex-col gap-2 rounded-2xl border border-[#efe6d6] bg-[#f7f1e7] p-2">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl border px-3 py-2 text-sm ${
              active
                ? "border-[var(--accent)] bg-white text-[var(--accent-ink)]"
                : "border-[#e4d9c8] bg-white/80 text-[var(--ink)] hover:bg-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
