"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, X } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { logout } from "@/app/actions/auth";

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="group flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
      {/* Three seats, two taken: the group filling up. */}
      <span className="flex items-center gap-[3px]" aria-hidden>
        <span className="size-2.5 rounded-full bg-accent" />
        <span className="size-2.5 rounded-full bg-accent" />
        <span className="size-2.5 rounded-full border-[1.5px] border-accent transition-colors duration-300 group-hover:bg-accent" />
      </span>
      <span className="font-display text-xl tracking-[-0.04em]">{APP_NAME}</span>
    </Link>
  );
}

type User = { name: string; role: string } | null;

export function SiteHeader({ user }: { user: User }) {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: "/groups", label: "Find a group" },
    ...(user ? [{ href: "/dashboard", label: "My groups" }] : []),
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  const isOn = (href: string) => path === href || path.startsWith(`${href}/`);
  const close = () => setOpen(false);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled && !open ? "border-b border-line bg-ink/75 backdrop-blur-xl" : "border-b border-transparent"
        }`}
      >
        <div className="shell flex h-[4.5rem] items-center gap-10">
          <Logo onClick={close} />
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isOn(l.href) ? "page" : undefined}
                className={`relative py-2 text-sm font-medium transition-colors duration-200 ${isOn(l.href) ? "text-text" : "text-dim hover:text-text"}`}
              >
                {l.label}
                {isOn(l.href) && (
                  <motion.span layoutId="nav-mark" className="absolute inset-x-0 -bottom-0.5 h-px bg-accent" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                )}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <Link href="/profile" className="flex items-center gap-2.5 text-sm text-dim transition-colors hover:text-text">
                  <span className="grid size-8 place-items-center rounded-full border border-line-strong font-display text-[13px] text-text">
                    {user.name[0]?.toUpperCase()}
                  </span>
                  <span className="max-w-28 truncate">{user.name.split(" ")[0]}</span>
                </Link>
                <form action={logout}>
                  <button className="grid size-9 place-items-center rounded-full text-faint transition-colors hover:text-text" aria-label="Sign out" title="Sign out">
                    <LogOut className="size-4" aria-hidden />
                  </button>
                </form>
                <Link href="/groups/new" className="btn btn-primary btn-sm">Start a group</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="px-2 text-sm font-medium text-dim transition-colors hover:text-text">Sign in</Link>
                <Link href="/register" className="btn btn-primary btn-sm">Create account</Link>
              </>
            )}
          </div>

          <button
            className="ml-auto grid size-10 place-items-center rounded-full border border-line-strong md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-40 flex flex-col bg-ink px-5 pb-8 pt-24 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <nav aria-label="Main" className="flex flex-col">
              {[...links, ...(user ? [{ href: "/groups/new", label: "Start a group" }, { href: "/profile", label: "Profile" }] : [])].map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 + i * 0.05 }}
                >
                  <Link
                    href={l.href}
                    onClick={close}
                    aria-current={isOn(l.href) ? "page" : undefined}
                    className={`flex items-baseline justify-between border-b border-line py-5 font-display text-3xl tracking-[-0.03em] ${isOn(l.href) ? "text-accent" : "text-text"}`}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              {user ? (
                <form action={logout}>
                  <button className="btn btn-quiet w-full py-3.5">Sign out</button>
                </form>
              ) : (
                <>
                  <Link href="/register" onClick={close} className="btn btn-primary w-full py-3.5">Create account</Link>
                  <Link href="/login" onClick={close} className="btn btn-quiet w-full py-3.5">Sign in</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
