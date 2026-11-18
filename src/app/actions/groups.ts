"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { findOpenGroup } from "@/lib/queries";
import { MAX_TARGET, MIN_TARGET, TRANSMISSIONS } from "@/lib/constants";

const { groups, memberships, models, cities, quotes } = schema;

export type GroupFormState = { error?: string; duplicateId?: number } | null;

async function memberCount(groupId: number) {
  const db = await getDb();
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(memberships).where(eq(memberships.groupId, groupId));
  return r?.n ?? 0;
}

export async function joinGroup(_prev: GroupFormState, fd: FormData): Promise<GroupFormState> {
  const groupId = Number(fd.get("groupId"));
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/groups/${groupId}`)}`);

  const db = await getDb();
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) return { error: "This group no longer exists" };
  if (group.status !== "forming" && group.status !== "ready") {
    return { error: "This group is no longer taking new members" };
  }

  // The unique index on (group, user) makes a double join impossible, even on a double click.
  await db
    .insert(memberships)
    .values({
      groupId,
      userId: user.id,
      purchaseMonth: String(fd.get("purchaseMonth") ?? "").slice(0, 40),
      note: String(fd.get("note") ?? "").trim().slice(0, 200),
    })
    .onConflictDoNothing();

  if (group.status === "forming" && (await memberCount(groupId)) >= group.targetSize) {
    await db.update(groups).set({ status: "ready" }).where(eq(groups.id, groupId));
  }
  revalidatePath("/", "layout");
  return null;
}

export async function leaveGroup(fd: FormData) {
  const groupId = Number(fd.get("groupId"));
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getDb();
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) return;
  await db.delete(memberships).where(and(eq(memberships.groupId, groupId), eq(memberships.userId, user.id)));
  if (group.status === "ready" && (await memberCount(groupId)) < group.targetSize) {
    await db.update(groups).set({ status: "forming" }).where(eq(groups.id, groupId));
  }
  revalidatePath("/", "layout");
}

const createSchema = z.object({
  modelId: z.coerce.number().int().positive("Pick a car"),
  cityId: z.coerce.number().int().positive("Pick a city"),
  variant: z.string().trim().max(60).default(""),
  fuel: z.string().trim().min(1).max(20),
  transmission: z.enum(TRANSMISSIONS),
  targetSize: z.coerce.number().int().min(MIN_TARGET).max(MAX_TARGET),
  days: z.coerce.number().int().refine((d) => [14, 21, 30].includes(d), "Pick a closing date"),
  description: z.string().trim().max(400).default(""),
  purchaseMonth: z.string().trim().max(40).default(""),
});

export async function createGroup(_prev: GroupFormState, fd: FormData): Promise<GroupFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/groups/new");

  const parsed = createSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const db = await getDb();

  const [model] = await db.select().from(models).where(eq(models.id, d.modelId));
  const [city] = await db.select().from(cities).where(eq(cities.id, d.cityId));
  if (!model || !city) return { error: "Pick a car and a city" };
  if (d.fuel !== "Any" && !model.fuels.split(",").includes(d.fuel)) return { error: "That fuel type is not sold for this car" };

  // One open group per car per city: a bigger group gets a better hearing from showrooms.
  const existing = await findOpenGroup(d.modelId, d.cityId);
  if (existing) return { duplicateId: existing.id };

  const [group] = await db
    .insert(groups)
    .values({
      modelId: d.modelId,
      cityId: d.cityId,
      creatorId: user.id,
      variant: d.variant,
      fuel: d.fuel,
      transmission: d.transmission,
      description: d.description,
      targetSize: d.targetSize,
      deadline: new Date(Date.now() + d.days * 86400000),
    })
    .returning({ id: groups.id });

  await db.insert(memberships).values({ groupId: group.id, userId: user.id, purchaseMonth: d.purchaseMonth });
  revalidatePath("/", "layout");
  redirect(`/groups/${group.id}?created=1`);
}

/** A member says "I want this offer". This is not a booking and commits them to nothing. */
export async function acceptQuote(fd: FormData) {
  const groupId = Number(fd.get("groupId"));
  const quoteId = Number(fd.get("quoteId"));
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getDb();
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), eq(quotes.groupId, groupId)));
  if (!group || !quote || group.status !== "offers") return;
  await db
    .update(memberships)
    .set({ stage: "accepted", acceptedQuoteId: quoteId })
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, user.id), sql`${memberships.stage} in ('interested','verified','accepted')`));
  revalidatePath("/", "layout");
}

export async function withdrawAcceptance(fd: FormData) {
  const groupId = Number(fd.get("groupId"));
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getDb();
  await db
    .update(memberships)
    .set({ stage: "verified", acceptedQuoteId: null })
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, user.id), eq(memberships.stage, "accepted")));
  revalidatePath("/", "layout");
}
