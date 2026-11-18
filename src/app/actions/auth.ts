"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { createSession, destroySession } from "@/lib/session";

export type FormState = { error?: string; fields?: Record<string, string> } | null;

function safeNext(next: unknown) {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

// Slows down password guessing: five wrong tries per email locks it for 10 minutes.
const attempts = new Map<string, { n: number; until: number }>();

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  password: z.string().min(8, "Use at least 8 characters for the password").max(100),
  cityId: z.coerce.number().int().positive("Pick your city"),
  locality: z.string().trim().max(80).default(""),
});

export async function register(_prev: FormState, fd: FormData): Promise<FormState> {
  const raw = Object.fromEntries(fd) as Record<string, string>;
  const fields = { name: raw.name ?? "", email: raw.email ?? "", phone: raw.phone ?? "", cityId: raw.cityId ?? "", locality: raw.locality ?? "" };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const data = parsed.data;
  const db = await getDb();

  const [city] = await db.select({ id: schema.cities.id }).from(schema.cities).where(eq(schema.cities.id, data.cityId));
  if (!city) return { error: "Pick your city", fields };
  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, data.email));
  if (existing) return { error: "An account with this email already exists. Sign in instead.", fields };

  const [user] = await db
    .insert(schema.users)
    .values({
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, 10),
      cityId: data.cityId,
      locality: data.locality,
    })
    .returning({ id: schema.users.id });

  await createSession(user.id);
  redirect(safeNext(raw.next));
}

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const fields = { email };
  if (!email || !password) return { error: "Enter your email and password", fields };

  const lock = attempts.get(email);
  if (lock && lock.n >= 5 && lock.until > Date.now()) {
    return { error: "Too many wrong tries. Wait 10 minutes and try again.", fields };
  }

  const db = await getDb();
  const [user] = await db
    .select({ id: schema.users.id, passwordHash: schema.users.passwordHash, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.email, email));
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    const cur = lock && lock.until > Date.now() ? lock.n : 0;
    attempts.set(email, { n: cur + 1, until: Date.now() + 10 * 60 * 1000 });
    return { error: "Email or password is wrong", fields };
  }
  attempts.delete(email);

  await createSession(user.id);
  const next = fd.get("next");
  redirect(next ? safeNext(next) : user.role === "admin" ? "/admin" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
