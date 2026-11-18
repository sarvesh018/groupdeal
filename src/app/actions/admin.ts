"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { GROUP_STATUSES, MEMBER_STAGES } from "@/lib/constants";

const { groups, memberships, quotes, showrooms, models } = schema;

export type AdminState = { error?: string; saved?: string } | null;

export async function setGroupStatus(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("groupId"));
  const status = String(fd.get("status"));
  if (!(GROUP_STATUSES as readonly string[]).includes(status)) return;
  const db = await getDb();
  await db.update(groups).set({ status }).where(eq(groups.id, id));
  revalidatePath("/", "layout");
}

export async function setMemberStage(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("membershipId"));
  const stage = String(fd.get("stage"));
  if (!(MEMBER_STAGES as readonly string[]).includes(stage)) return;
  const db = await getDb();
  await db.update(memberships).set({ stage }).where(eq(memberships.id, id));
  revalidatePath("/", "layout");
}

const money = (label: string, min = 0) =>
  z.coerce.number({ message: `${label}: enter a number` }).int().min(min, `${label}: enter a valid amount`).max(100000000);

const quoteSchema = z.object({
  groupId: z.coerce.number().int().positive(),
  showroomId: z.coerce.number().int().positive("Pick a showroom"),
  exShowroom: money("Ex-showroom price", 100000),
  makerOffer: money("Carmaker offer"),
  dealerDiscount: money("Showroom discount"),
  insurance: money("Insurance"),
  rto: money("RTO and registration"),
  accessories: money("Accessories"),
  otherCharges: money("Other charges"),
  deliveryWeeks: z.coerce.number().int().min(0).max(52),
  validDays: z.coerce.number().int().min(1).max(60),
});

export async function addQuote(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const parsed = quoteSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const q = parsed.data;
  const db = await getDb();

  // Only an authorised showroom of this brand, in this group's city, may quote.
  const [group] = await db
    .select({ cityId: groups.cityId, brandId: models.brandId })
    .from(groups)
    .innerJoin(models, eq(groups.modelId, models.id))
    .where(eq(groups.id, q.groupId));
  if (!group) return { error: "Group not found" };
  const [room] = await db
    .select({ id: showrooms.id })
    .from(showrooms)
    .where(and(eq(showrooms.id, q.showroomId), eq(showrooms.cityId, group.cityId), eq(showrooms.brandId, group.brandId)));
  if (!room) return { error: "Pick a showroom of this brand in this city" };

  const onRoad = q.exShowroom - q.makerOffer - q.dealerDiscount + q.insurance + q.rto + q.accessories + q.otherCharges;
  if (onRoad <= 0) return { error: "Discounts are larger than the price. Check the amounts." };

  await db.insert(quotes).values({
    groupId: q.groupId,
    showroomId: q.showroomId,
    exShowroom: q.exShowroom,
    makerOffer: q.makerOffer,
    dealerDiscount: q.dealerDiscount,
    insurance: q.insurance,
    rto: q.rto,
    accessories: q.accessories,
    otherCharges: q.otherCharges,
    onRoad,
    deliveryWeeks: q.deliveryWeeks,
    validUntil: new Date(Date.now() + q.validDays * 86400000),
  });
  revalidatePath("/", "layout");
  return { saved: "Quote added" };
}

export async function deleteQuote(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("quoteId"));
  const db = await getDb();
  await db.update(memberships).set({ acceptedQuoteId: null, stage: "verified" }).where(and(eq(memberships.acceptedQuoteId, id), eq(memberships.stage, "accepted")));
  await db.delete(quotes).where(eq(quotes.id, id));
  revalidatePath("/", "layout");
}

export async function setUserRole(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("userId"));
  const role = String(fd.get("role"));
  if (!["buyer", "admin"].includes(role) || id === admin.id) return;
  const db = await getDb();
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, id));
  revalidatePath("/admin/users");
}
