"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { findOpenGroup } from "@/lib/queries";
import { MAX_TARGET, MIN_TARGET, TRANSMISSIONS } from "@/lib/constants";
import { FEATURES, splitList } from "@/lib/rules";
import { buyerReportedBooking, cancelOpenReferrals, logEvent, openReferral } from "@/lib/portal";
import { readUpload } from "@/lib/files";

const { groups, memberships, models, cities, quotes, referrals, bookingProofs } = schema;

export type GroupFormState = { error?: string; duplicateId?: number; saved?: string } | null;

/** A member's own choices within the group's car. Unknown values are dropped. */
function readChoices(fd: FormData, model: { variants: string; colours: string }) {
  const variants = splitList(model.variants);
  const colours = splitList(model.colours);
  const variant = String(fd.get("variant") ?? "");
  const colour = String(fd.get("colour") ?? "");
  const transmission = String(fd.get("myTransmission") ?? "");
  return {
    variant: variants.includes(variant) ? variant : "",
    colour: colours.includes(colour) ? colour : "",
    altColours: fd.getAll("altColours").map(String).filter((c) => colours.includes(c) && c !== colour).join(","),
    transmission: ["Manual", "Automatic"].includes(transmission) ? transmission : "",
    features: fd.getAll("features").map(String).filter((f) => FEATURES.includes(f)).join(","),
    flexibleTrim: fd.get("flexibleTrim") === "on",
  };
}

async function modelOfGroup(groupId: number) {
  const db = await getDb();
  const [row] = await db
    .select({ variants: models.variants, colours: models.colours })
    .from(groups)
    .innerJoin(models, eq(groups.modelId, models.id))
    .where(eq(groups.id, groupId));
  return row;
}

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

  const model = await modelOfGroup(groupId);
  // The unique index on (group, user) makes a double join impossible, even on a double click.
  await db
    .insert(memberships)
    .values({
      groupId,
      userId: user.id,
      ...readChoices(fd, model),
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

  const parsed = createSchema.safeParse({ ...Object.fromEntries(fd), variant: fd.get("groupVariant") ?? "" });
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

  await db.insert(memberships).values({ groupId: group.id, userId: user.id, purchaseMonth: d.purchaseMonth, ...readChoices(fd, model) });
  revalidatePath("/", "layout");
  redirect(`/groups/${group.id}?created=1`);
}

/** A member edits their own choices while showrooms can still take them into account. */
export async function updateChoices(_prev: GroupFormState, fd: FormData): Promise<GroupFormState> {
  const groupId = Number(fd.get("groupId"));
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getDb();
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group || !["forming", "ready", "negotiating"].includes(group.status)) return { error: "Choices are locked once offers are out." };
  const model = await modelOfGroup(groupId);
  await db
    .update(memberships)
    .set({ ...readChoices(fd, model), purchaseMonth: String(fd.get("purchaseMonth") ?? "").slice(0, 40) })
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, user.id)));
  revalidatePath(`/groups/${groupId}`);
  return { saved: "Your choices are saved." };
}

/**
 * A member says "I want this offer" and agrees to share their name and phone with
 * that showroom. This is not a booking and commits them to nothing.
 */
export async function acceptQuote(_prev: GroupFormState, fd: FormData): Promise<GroupFormState> {
  const groupId = Number(fd.get("groupId"));
  const quoteId = Number(fd.get("quoteId"));
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (fd.get("consent") !== "on") return { error: "Tick the box to let this showroom contact you." };
  const db = await getDb();
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.id, quoteId), eq(quotes.groupId, groupId), eq(quotes.status, "submitted")));
  if (!group || !quote || group.status !== "offers") return { error: "This offer is no longer open." };
  const [me] = await db
    .update(memberships)
    .set({ stage: "accepted", acceptedQuoteId: quoteId })
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, user.id), sql`${memberships.stage} in ('interested','verified','accepted')`))
    .returning({ id: memberships.id });
  if (!me) return { error: "You can't change your pick after booking." };
  await openReferral({ membershipId: me.id, groupId, showroomId: quote.showroomId, quoteId, actorId: user.id });
  revalidatePath("/", "layout");
  return null;
}

export async function withdrawAcceptance(fd: FormData) {
  const groupId = Number(fd.get("groupId"));
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = await getDb();
  const [me] = await db
    .update(memberships)
    .set({ stage: "verified", acceptedQuoteId: null })
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, user.id), eq(memberships.stage, "accepted")))
    .returning({ id: memberships.id });
  if (me) await cancelOpenReferrals(me.id, user.id);
  revalidatePath("/", "layout");
}

/**
 * The buyer tells us they booked, with the showroom's booking number and an optional
 * receipt photo. If the showroom hasn't recorded the booking, it is asked to confirm.
 */
export async function reportBooking(_prev: GroupFormState, fd: FormData): Promise<GroupFormState> {
  const groupId = Number(fd.get("groupId"));
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const bookingNo = String(fd.get("bookingNo") ?? "").trim().slice(0, 40);
  if (bookingNo.length < 3) return { error: "Enter the booking number from your receipt." };
  const upload = await readUpload(fd.get("receipt"));
  if (upload.error) return { error: upload.error };
  const db = await getDb();
  const [row] = await db
    .select({ m: memberships, q: quotes })
    .from(memberships)
    .innerJoin(quotes, eq(memberships.acceptedQuoteId, quotes.id))
    .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, user.id)));
  if (!row) return { error: "Pick an offer first." };
  const [ref] = await db.select().from(referrals).where(and(eq(referrals.membershipId, row.m.id), eq(referrals.showroomId, row.q.showroomId)));
  if (!ref) return { error: "We couldn't find your referral. Contact support." };
  await db.update(referrals).set({ buyerReportedAt: new Date(), buyerBookingNo: bookingNo }).where(eq(referrals.id, ref.id));
  if (upload.file) {
    await db.insert(bookingProofs).values({ referralId: ref.id, uploadedBy: user.id, fileName: upload.file.name, dataUrl: upload.file.dataUrl });
    await logEvent(ref.id, "receipt", `Buyer uploaded ${upload.file.name}`, user.id);
  }
  await buyerReportedBooking(ref.id, user.id);
  revalidatePath("/", "layout");
  return { saved: ref.status === "booked" || ref.status === "delivered" ? "Thanks. The showroom has already recorded your booking." : "Thanks. We've asked the showroom to confirm your booking." }
}
