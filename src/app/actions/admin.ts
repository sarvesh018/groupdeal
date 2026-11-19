"use server";

import { z } from "zod";
import { and, asc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { GROUP_STATUSES, MEMBER_STAGES } from "@/lib/constants";

import { adminIds, cancelOpenReferrals, confirmBooking, logEvent, notify, staffIds } from "@/lib/portal";
import { monthLabel } from "@/lib/rules";

const { groups, memberships, quotes, quoteLines, showrooms, models, invitations, referrals, disputes, fees, feeBands, statements, users } = schema;

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
    .where(and(eq(showrooms.id, q.showroomId), eq(showrooms.cityId, group.cityId), eq(showrooms.brandId, group.brandId), eq(showrooms.status, "approved")));
  if (!room) return { error: "Pick a showroom of this brand in this city" };

  const onRoad = q.exShowroom - q.makerOffer - q.dealerDiscount + q.insurance + q.rto + q.accessories + q.otherCharges;
  if (onRoad <= 0) return { error: "Discounts are larger than the price. Check the amounts." };

  // A quote received by phone or email, entered by the admin: one price for all variants.
  const prices = {
    exShowroom: q.exShowroom,
    makerOffer: q.makerOffer,
    dealerDiscount: q.dealerDiscount,
    insurance: q.insurance,
    rto: q.rto,
    accessories: q.accessories,
    otherCharges: q.otherCharges,
    onRoad,
  };
  const now = new Date();
  const values = { ...prices, deliveryWeeks: q.deliveryWeeks, validUntil: new Date(now.getTime() + q.validDays * 86400000), status: "submitted", submittedAt: now };
  const [saved] = await db
    .insert(quotes)
    .values({ groupId: q.groupId, showroomId: q.showroomId, ...values })
    .onConflictDoUpdate({ target: [quotes.groupId, quotes.showroomId], set: values })
    .returning({ id: quotes.id });
  await db.delete(quoteLines).where(eq(quoteLines.quoteId, saved.id));
  await db.insert(quoteLines).values({ quoteId: saved.id, variant: "All variants", ...prices });
  await db
    .insert(invitations)
    .values({ groupId: q.groupId, showroomId: q.showroomId, status: "quoted", deadline: now, respondedAt: now })
    .onConflictDoUpdate({ target: [invitations.groupId, invitations.showroomId], set: { status: "quoted", respondedAt: now } });
  revalidatePath("/", "layout");
  return { saved: "Quote added" };
}

export async function deleteQuote(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("quoteId"));
  const db = await getDb();
  const picked = await db
    .update(memberships)
    .set({ acceptedQuoteId: null, stage: "verified" })
    .where(and(eq(memberships.acceptedQuoteId, id), eq(memberships.stage, "accepted")))
    .returning({ id: memberships.id });
  for (const m of picked) await cancelOpenReferrals(m.id, admin.id);
  // Members who already booked keep their pick; the quote is withdrawn instead of deleted.
  const [still] = await db.select({ id: memberships.id }).from(memberships).where(eq(memberships.acceptedQuoteId, id)).limit(1);
  if (still) await db.update(quotes).set({ status: "draft" }).where(eq(quotes.id, id));
  else await db.delete(quotes).where(eq(quotes.id, id));
  revalidatePath("/", "layout");
}

export async function setUserRole(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("userId"));
  const role = String(fd.get("role"));
  if (!["buyer", "admin"].includes(role) || id === admin.id) return;
  // Showroom staff accounts are managed from the showroom's team page.
  const db0 = await getDb();
  const [u] = await db0.select({ role: users.role }).from(users).where(eq(users.id, id));
  if (!u || u.role === "showroom") return;
  const db = await getDb();
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, id));
  revalidatePath("/admin/users");
}

/* -------------------------------------------------------------- showrooms */

export async function setShowroomStatus(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("showroomId"));
  const status = String(fd.get("status"));
  if (!["pending", "approved", "suspended"].includes(status)) return;
  const db = await getDb();
  const [before] = await db.select({ status: showrooms.status, name: showrooms.name }).from(showrooms).where(eq(showrooms.id, id));
  if (!before || before.status === status) return;
  await db.update(showrooms).set({ status, ...(status === "approved" ? { verifiedAt: new Date() } : {}) }).where(eq(showrooms.id, id));
  if (status === "approved") await notify(await staffIds(id), { title: "Your showroom is verified", body: "You'll now get invitations to quote for groups in your city.", href: "/showroom" });
  if (status === "suspended") await notify(await staffIds(id), { title: "Your showroom account is paused", body: "Contact GroupDeal support.", href: "/showroom" });
  revalidatePath("/admin/showrooms", "layout");
}

export async function setFreeBookings(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("showroomId"));
  const n = Number(fd.get("freeBookings"));
  if (!Number.isInteger(n) || n < 0 || n > 50) return;
  const db = await getDb();
  await db.update(showrooms).set({ freeBookings: n }).where(eq(showrooms.id, id));
  revalidatePath(`/admin/showrooms/${id}`);
}

/* ----------------------------------------------------- invitations, offers */

export async function inviteShowrooms(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const groupId = Number(fd.get("groupId"));
  const ids = fd.getAll("showroomId").map(Number).filter(Boolean);
  const days = Number(fd.get("days"));
  if (ids.length === 0) return { error: "Tick at least one showroom." };
  if (![2, 3, 5, 7].includes(days)) return { error: "Pick a deadline." };
  const db = await getDb();
  const [group] = await db
    .select({ id: groups.id, status: groups.status, cityId: groups.cityId, brandId: models.brandId, model: models.name })
    .from(groups)
    .innerJoin(models, eq(groups.modelId, models.id))
    .where(eq(groups.id, groupId));
  if (!group) return { error: "Group not found." };
  if (!["forming", "ready", "negotiating"].includes(group.status)) return { error: "Invite showrooms before offers are released." };
  const rooms = await db
    .select({ id: showrooms.id })
    .from(showrooms)
    .where(and(inArray(showrooms.id, ids), eq(showrooms.cityId, group.cityId), eq(showrooms.brandId, group.brandId), eq(showrooms.status, "approved")));
  if (rooms.length === 0) return { error: "Only verified showrooms of this brand in this city can be invited." };
  const deadline = new Date(Date.now() + days * 86400000);
  for (const r of rooms) {
    const [inv] = await db
      .insert(invitations)
      .values({ groupId, showroomId: r.id, deadline })
      .onConflictDoUpdate({ target: [invitations.groupId, invitations.showroomId], set: { deadline } })
      .returning({ id: invitations.id });
    await notify(await staffIds(r.id, ["owner", "manager"]), {
      title: `Quote request: ${group.model} group`,
      body: `Send your best price by ${deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`,
      href: `/showroom/invitations/${inv.id}`,
    });
  }
  if (group.status !== "negotiating") await db.update(groups).set({ status: "negotiating" }).where(eq(groups.id, groupId));
  revalidatePath("/", "layout");
  return { saved: `Invited ${rooms.length} ${rooms.length === 1 ? "showroom" : "showrooms"}. Quotes close in ${days} days.` };
}

/** Members see every submitted quote at once, each priced for their own choices. */
export async function releaseOffers(fd: FormData) {
  await requireAdmin();
  const groupId = Number(fd.get("groupId"));
  const db = await getDb();
  const sent = await db.select({ id: quotes.id }).from(quotes).where(and(eq(quotes.groupId, groupId), eq(quotes.status, "submitted")));
  if (sent.length === 0) return;
  // Invitations still open close now, so nobody can change a price after buyers see it.
  await db.update(invitations).set({ deadline: new Date() }).where(and(eq(invitations.groupId, groupId), gte(invitations.deadline, new Date())));
  await db.update(groups).set({ status: "offers" }).where(eq(groups.id, groupId));
  const members = await db.select({ userId: memberships.userId }).from(memberships).where(eq(memberships.groupId, groupId));
  await notify(members.map((m) => m.userId), {
    title: `${sent.length} ${sent.length === 1 ? "offer is" : "offers are"} in for your group`,
    body: "Each shows your price for your variant and colour.",
    href: `/groups/${groupId}`,
  });
  revalidatePath("/", "layout");
}

/* --------------------------------------------------------------- disputes */

export async function resolveDispute(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = Number(fd.get("disputeId"));
  const decision = String(fd.get("decision"));
  const note = String(fd.get("note") ?? "").trim().slice(0, 400);
  if (!["fee_due", "no_fee"].includes(decision)) return { error: "Pick a decision." };
  if (note.length < 5) return { error: "Write a short reason. The showroom sees it." };
  const db = await getDb();
  const [row] = await db.select({ d: disputes, r: referrals }).from(disputes).innerJoin(referrals, eq(disputes.referralId, referrals.id)).where(eq(disputes.id, id));
  if (!row || !["open", "rejected"].includes(row.d.status)) return { error: "Already decided." };
  if (decision === "fee_due") await confirmBooking(row.r.id, row.r.buyerBookingNo, admin.id, `GroupDeal confirmed the booking: ${note}`);
  await db.update(disputes).set({ status: decision, resolutionNote: note, resolvedAt: new Date() }).where(eq(disputes.id, id));
  await logEvent(row.r.id, decision, note, admin.id);
  await notify(await staffIds(row.r.showroomId, ["owner", "manager"]), {
    title: `Decision on booking ${row.r.code}`,
    body: decision === "fee_due" ? `Fee due. ${note}` : `No fee. ${note}`,
    href: "/showroom/billing#disputes",
  });
  revalidatePath("/", "layout");
  return { saved: "Decision saved." };
}

/* ---------------------------------------------------------------- billing */

export async function saveFeeBands(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const rows: { minPrice: number; maxPrice: number | null; fee: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const min = String(fd.get(`min_${i}`) ?? "").trim();
    const fee = String(fd.get(`fee_${i}`) ?? "").trim();
    if (min === "" && fee === "") continue;
    const minPrice = Math.round(Number(min) * 100000);
    const feeN = Number(fee);
    if (!Number.isFinite(minPrice) || minPrice < 0 || !Number.isInteger(feeN) || feeN < 0 || feeN > 500000) return { error: `Row ${i + 1}: enter a starting price in lakh and a whole-rupee fee.` };
    rows.push({ minPrice, maxPrice: null, fee: feeN });
  }
  if (rows.length === 0) return { error: "Keep at least one band." };
  rows.sort((a, b) => a.minPrice - b.minPrice);
  if (rows[0].minPrice !== 0) return { error: "The first band must start at 0." };
  if (new Set(rows.map((r) => r.minPrice)).size !== rows.length) return { error: "Two bands start at the same price." };
  rows.forEach((r, i) => (r.maxPrice = rows[i + 1]?.minPrice ?? null));
  const db = await getDb();
  await db.delete(feeBands);
  await db.insert(feeBands).values(rows);
  revalidatePath("/admin/billing");
  return { saved: "Fee bands saved. They apply to bookings from now on." };
}

/** First and last instant of a calendar month in India. */
function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1) - 5.5 * 3600000);
  const end = new Date(Date.UTC(y, m, 1) - 5.5 * 3600000);
  return { start, end };
}

export async function createStatements(_prev: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const month = String(fd.get("month") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { error: "Pick a month." };
  const { start, end } = monthRange(month);
  const db = await getDb();
  const due = await db
    .select()
    .from(fees)
    .where(and(eq(fees.status, "due"), isNull(fees.statementId), gte(fees.createdAt, start), lt(fees.createdAt, end)))
    .orderBy(asc(fees.showroomId));
  if (due.length === 0) return { error: `No unbilled fees for ${monthLabel(month)}.` };
  const byShowroom = new Map<number, typeof due>();
  for (const f of due) byShowroom.set(f.showroomId, [...(byShowroom.get(f.showroomId) ?? []), f]);
  let made = 0;
  for (const [showroomId, list] of byShowroom) {
    const amount = list.reduce((a, f) => a + f.amount, 0);
    const gst = list.reduce((a, f) => a + f.gst, 0);
    const [existing] = await db.select().from(statements).where(and(eq(statements.showroomId, showroomId), eq(statements.month, month)));
    let stId: number;
    if (existing) {
      // Late confirmations for a month already billed are added to that month's invoice.
      if (existing.status === "paid") continue;
      await db.update(statements).set({ amount: existing.amount + amount, gst: existing.gst + gst }).where(eq(statements.id, existing.id));
      stId = existing.id;
    } else {
      const [st] = await db
        .insert(statements)
        .values({ number: `GD-${month.replace("-", "")}-${String(showroomId).padStart(4, "0")}`, showroomId, month, amount, gst })
        .returning({ id: statements.id });
      stId = st.id;
      made++;
    }
    await db.update(fees).set({ statementId: stId }).where(inArray(fees.id, list.map((f) => f.id)));
    await notify(await staffIds(showroomId, ["owner"]), { title: `Invoice for ${monthLabel(month)}`, body: `${list.length} bookings.`, href: `/showroom/billing/${stId}` });
  }
  revalidatePath("/", "layout");
  return { saved: `${made} new ${made === 1 ? "invoice" : "invoices"} for ${monthLabel(month)}.` };
}

export async function markStatementPaid(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("statementId"));
  const db = await getDb();
  const now = new Date();
  await db.update(statements).set({ status: "paid", paidAt: now }).where(eq(statements.id, id));
  await db.update(fees).set({ status: "paid" }).where(and(eq(fees.statementId, id), eq(fees.status, "due")));
  revalidatePath("/", "layout");
}

export async function setFeeStatus(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("feeId"));
  const status = String(fd.get("status"));
  if (!["due", "waived", "cancelled"].includes(status)) return;
  const db = await getDb();
  const [f] = await db.select().from(fees).where(eq(fees.id, id));
  if (!f || f.status === "paid" || f.statementId) return;
  await db.update(fees).set({ status }).where(eq(fees.id, id));
  revalidatePath("/admin/billing");
}

export async function notifyAdmins(title: string) {
  await notify(await adminIds(), { title });
}
