"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminTab({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const on = exact ? path === href : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${on ? "bg-text text-ink" : "text-dim hover:text-text"}`}
    >
      {children}
    </Link>
  );
}
