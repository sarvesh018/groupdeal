"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/session";

export type ProfileState = { error?: string; saved?: string } | null;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  cityId: z.coerce.number().int().positive("Pick your city"),
  locality: z.string().trim().max(80).default(""),
});

export async function updateProfile(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const db = await getDb();
  await db.update(schema.users).set(parsed.data).where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
  return { saved: "Profile saved" };
}

export async function changePassword(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (next.length < 8) return { error: "Use at least 8 characters for the new password" };
  const db = await getDb();
  const [row] = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id));
  if (!row || !(await bcrypt.compare(current, row.hash))) return { error: "Current password is wrong" };
  await db.update(schema.users).set({ passwordHash: await bcrypt.hash(next, 10) }).where(eq(schema.users.id, user.id));
  return { saved: "Password changed" };
}
