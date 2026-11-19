import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/session";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Sign in" };

// Demo logins are listed only on a local copy, or when SHOW_DEMO_LOGINS=1 is set on purpose.
const showDemo = !process.env.DATABASE_URL || process.env.SHOW_DEMO_LOGINS === "1";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <AuthShell title="Welcome back." lead={next ? "Sign in to take your seat in this group." : "Pick up where your groups left off."}>
      <div className="w-full max-w-md">
        <LoginForm next={next} />
        <p className="mt-6 text-sm text-dim">
          New here?{" "}
          <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-text underline decoration-accent underline-offset-4 hover:text-accent">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-sm text-dim">
          Run a car showroom?{" "}
          <Link href="/showroom/register" className="font-semibold text-text underline decoration-accent underline-offset-4 hover:text-accent">
            Apply as a showroom
          </Link>
        </p>
        {showDemo && (
          <div className="mt-10 border-t border-line pt-5 text-sm text-dim">
            <p className="font-medium text-text">Demo accounts</p>
            <p className="mt-1.5">Buyer: buyer@groupdeal.demo / demo1234</p>
            <p>Showroom owner: showroom@groupdeal.demo / demo1234</p>
            <p>Sales executive: sales@groupdeal.demo / demo1234</p>
            <p>Admin: admin@groupdeal.demo / admin1234</p>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
