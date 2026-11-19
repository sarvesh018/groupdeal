import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/session";
import { listCities } from "@/lib/queries";
import { getDb, schema } from "@/db";
import { asc } from "drizzle-orm";
import { AuthShell } from "@/components/auth-shell";
import { ShowroomRegisterForm } from "@/components/showroom-forms";

export const metadata = { title: "Apply as a showroom" };

export default async function ShowroomRegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const db = await getDb();
  const [cities, brands] = await Promise.all([listCities(), db.select().from(schema.brands).orderBy(asc(schema.brands.name))]);
  return (
    <AuthShell
      title="Buyers who've already decided."
      filled={10}
      seatNote="A full group: ten buyers, one car, one city."
      lead="Groups of verified buyers want the same car in your city. Quote once, and pay only when a referred buyer books."
    >
      <div className="w-full max-w-xl">
        <ShowroomRegisterForm cities={cities} brands={brands} />
        <p className="mt-6 text-sm text-dim">
          Already applied?{" "}
          <Link href="/login" className="font-semibold text-text underline decoration-accent underline-offset-4 hover:text-accent">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
