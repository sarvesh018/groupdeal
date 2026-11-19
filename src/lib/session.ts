import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const COOKIE = "groupdeal_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
      throw new Error("AUTH_SECRET is not set. Add it to your environment variables before launching.");
    }
    return new TextEncoder().encode("local-development-secret-change-me-before-launch");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  cityId: number;
  locality: string;
};

/** The signed-in user, or null. Looked up once per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = Number(payload.uid);
    if (!uid) return null;
    const db = await getDb();
    const [u] = await db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        phone: schema.users.phone,
        role: schema.users.role,
        cityId: schema.users.cityId,
        locality: schema.users.locality,
      })
      .from(schema.users)
      .where(eq(schema.users.id, uid));
    return u ?? null;
  } catch {
    return null;
  }
});

export async function requireUser(next?: string) {
  const u = await getCurrentUser();
  if (!u) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return u;
}

export async function requireAdmin() {
  const u = await requireUser("/admin");
  if (u.role !== "admin") redirect("/dashboard");
  return u;
}

export type ShowroomContext = {
  user: CurrentUser;
  staffRole: string;
  showroom: typeof schema.showrooms.$inferSelect & { brand: string; city: string };
};

/** The showroom the signed-in staff member works for, or null. */
export const getShowroomContext = cache(async (): Promise<ShowroomContext | null> => {
  const user = await getCurrentUser();
  if (!user || user.role !== "showroom") return null;
  const db = await getDb();
  const [row] = await db
    .select({ staffRole: schema.showroomStaff.role, showroom: schema.showrooms, brand: schema.brands.name, city: schema.cities.name })
    .from(schema.showroomStaff)
    .innerJoin(schema.showrooms, eq(schema.showroomStaff.showroomId, schema.showrooms.id))
    .innerJoin(schema.brands, eq(schema.showrooms.brandId, schema.brands.id))
    .innerJoin(schema.cities, eq(schema.showrooms.cityId, schema.cities.id))
    .where(eq(schema.showroomStaff.userId, user.id));
  if (!row) return null;
  return { user, staffRole: row.staffRole, showroom: { ...row.showroom, brand: row.brand, city: row.city } };
});

/**
 * Showroom pages and actions. `approved` (default) also requires an admin to have
 * verified the showroom; `owner` limits to the account owner.
 */
export async function requireShowroom(opts: { approved?: boolean; owner?: boolean; next?: string } = {}) {
  const user = await requireUser(opts.next ?? "/showroom");
  if (user.role !== "showroom") redirect(user.role === "admin" ? "/admin" : "/dashboard");
  const ctx = await getShowroomContext();
  if (!ctx) redirect("/login");
  if ((opts.approved ?? true) && ctx.showroom.status !== "approved") redirect("/showroom");
  if (opts.owner && ctx.staffRole !== "owner") redirect("/showroom");
  return ctx;
}

/** Where to send someone after they sign in. */
export function homeFor(role: string) {
  return role === "admin" ? "/admin" : role === "showroom" ? "/showroom" : "/dashboard";
}
