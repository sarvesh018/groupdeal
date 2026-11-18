import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/manrope";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { SmoothScroll } from "@/components/smooth-scroll";

export const metadata: Metadata = {
  title: { default: `${APP_NAME}: group car buying`, template: `%s | ${APP_NAME}` },
  description: APP_TAGLINE,
};

export const viewport: Viewport = { themeColor: "#090a0d" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SmoothScroll />
        <SiteHeader user={user ? { name: user.name, role: user.role } : null} />
        <main className="flex-1 pt-[4.5rem]">{children}</main>
        <footer className="rule mt-28">
          <div className="shell flex flex-col gap-6 py-10 text-sm text-faint sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-2xl tracking-[-0.04em] text-text">{APP_NAME}</p>
              <p className="mt-2 max-w-sm leading-relaxed">A demo. Cars, prices, showrooms and people shown here are sample data.</p>
            </div>
            <nav aria-label="Footer" className="flex gap-7">
              <Link href="/groups" className="transition-colors hover:text-text">Find a group</Link>
              <Link href="/groups/new" className="transition-colors hover:text-text">Start a group</Link>
              <Link href={user ? "/dashboard" : "/login"} className="transition-colors hover:text-text">{user ? "My groups" : "Sign in"}</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
