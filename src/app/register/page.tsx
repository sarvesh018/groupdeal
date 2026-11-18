import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listCities } from "@/lib/queries";
import { RegisterForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/dashboard");
  const cities = await listCities();
  return (
    <AuthShell title="Take your seat." lead="Free to join. Joining a group never commits you to buy.">
      <div className="w-full max-w-lg">
        <RegisterForm cities={cities} next={next} />
        <p className="mt-6 text-sm text-dim">
          Already have an account?{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-text underline decoration-accent underline-offset-4 hover:text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
