"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { and, eq, isNull, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { createSession, getCurrentUser, requireShowroom, type ShowroomContext } from "@/lib/session";
import { adminIds, confirmBooking, logEvent, notify, staffIds } from "@/lib/portal";
import { readUpload } from "@/lib/files";
import { LOST_REASONS, REFERRAL_LABEL, onRoadOf, splitList } from "@/lib/rules";
import { invitationOpen } from "@/lib/showroom-queries";

const { users, showrooms, showroomStaff, showroomDocuments, invitations, groups, models, quotes, quoteLines, quoteColours, referrals, memberships, disputes } = schema;

export type PortalState = { error?: string; saved?: string; fields?: Record<string, string> } | null;

const phone = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number");
const gstin = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === "" || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), "Enter a valid 15-character GSTIN, or leave it blank for now");

const registerSchema = z.object({
  ownerName: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone,
  password: z.string().min(8, "Use at least 8 characters for the password").max(100),
  showroomName: z.string().trim().min(3, "Enter the showroom's name").max(100),
  brandId: z.coerce.number().int().positive("Pick the brand you sell"),
  cityId: z.coerce.number().int().positive("Pick your city"),
  locality: z.string().trim().min(2, "Enter the showroom's area").max(80),
  address: z.string().trim().max(300).default(""),
  gstNumber: gstin,
  dealerCode: z.string().trim().max(40).default(""),
});

/** A showroom signs up. It can sign in straight away but sees nothing until an admin approves it. */
export async function registerShowroom(_prev: PortalState, fd: FormData): Promise<PortalState> {
  const raw = Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const fields = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== "password"));
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const d = parsed.data;
  const upload = await readUpload(fd.get("document"));
  if (upload.error) return { error: upload.error, fields };

  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email));
  if (existing) return { error: "An account with this email already exists. Sign in instead.", fields };

  const [user] = await db
    .insert(users)
    .values({ name: d.ownerName, email: d.email, phone: d.phone, passwordHash: await bcrypt.hash(d.password, 10), role: "showroom", cityId: d.cityId, locality: d.locality })
    .returning({ id: users.id });
  const [room] = await db
    .insert(showrooms)
    .values({ name: d.showroomName, brandId: d.brandId, cityId: d.cityId, locality: d.locality, phone: d.phone, rating: 0, address: d.address, gstNumber: d.gstNumber, dealerCode: d.dealerCode, status: "pending" })
    .returning({ id: showrooms.id });
  await db.insert(showroomStaff).values({ showroomId: room.id, userId: user.id, role: "owner" });
  if (upload.file) await db.insert(showroomDocuments).values({ showroomId: room.id, fileName: upload.file.name, dataUrl: upload.file.dataUrl });

  await notify(await adminIds(), { title: `New showroom to verify: ${d.showroomName}`, body: "Check its documents, then approve it.", href: `/admin/showrooms/${room.id}` });
  await createSession(user.id);
  redirect("/showroom");
}

/* ------------------------------------------------------------- invitations */

async function loadInvitation(ctx: ShowroomContext, id: number) {
  const db = await getDb();
  const [row] = await db
    .select({ inv: invitations, groupStatus: groups.status, groupId: groups.id, variants: models.variants, colours: models.colours, modelName: models.name })
    .from(invitations)
    .innerJoin(groups, eq(invitations.groupId, groups.id))
    .innerJoin(models, eq(groups.modelId, models.id))
    .where(and(eq(invitations.id, id), eq(invitations.showroomId, ctx.showroom.id)));
  return row;
}

export async function respondInvitation(fd: FormData) {
  const ctx = await requireShowroom();
  if (ctx.staffRole === "executive") return;
  const id = Number(fd.get("invitationId"));
  const decision = String(fd.get("decision"));
  const row = await loadInvitation(ctx, id);
  if (!row || !invitationOpen(row.inv, row.groupStatus) || row.inv.status === "quoted") return;
  const db = await getDb();
  await db
    .update(invitations)
    .set({ status: decision === "decline" ? "declined" : "accepted", respondedAt: new Date() })
    .where(eq(invitations.id, id));
  if (decision === "decline") {
    await notify(await adminIds(), { title: `${ctx.showroom.name} declined to quote`, body: `${row.modelName} group #${row.groupId}`, href: `/admin/groups/${row.groupId}` });
  }
  revalidatePath("/showroom", "layout");
}

const amount = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/[,\s₹]/g, "");
  if (s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : NaN;
};

/**
 * Save the showroom's rate card for a group: one line per variant it can supply,
 * and delivery time per colour. Sealed: other showrooms and buyers can't see it
 * until the admin releases offers. Editable until the invitation deadline.
 */
export async function saveQuote(_prev: PortalState, fd: FormData): Promise<PortalState> {
  const ctx = await requireShowroom();
  if (ctx.staffRole === "executive") return { error: "Only the owner or a manager can send quotes." };
  const id = Number(fd.get("invitationId"));
  const submit = fd.get("intent") === "submit";
  const row = await loadInvitation(ctx, id);
  if (!row) return { error: "Invitation not found." };
  if (!invitationOpen(row.inv, row.groupStatus)) return { error: "This invitation has closed. Quotes can no longer be changed." };

  const variants = splitList(row.variants);
  const lines: (typeof quoteLines.$inferInsert)[] = [];
  for (let i = 0; i < variants.length + 1; i++) {
    const variant = i < variants.length ? variants[i] : "All variants";
    if (fd.get(`line_${i}_on`) !== "on") continue;
    const v = {
      exShowroom: amount(fd.get(`line_${i}_exShowroom`)),
      makerOffer: amount(fd.get(`line_${i}_makerOffer`)),
      dealerDiscount: amount(fd.get(`line_${i}_dealerDiscount`)),
      insurance: amount(fd.get(`line_${i}_insurance`)),
      rto: amount(fd.get(`line_${i}_rto`)),
      accessories: amount(fd.get(`line_${i}_accessories`)),
      otherCharges: amount(fd.get(`line_${i}_otherCharges`)),
    };
    if (Object.values(v).some((n) => Number.isNaN(n) || n < 0)) return { error: `${variant}: enter amounts as whole rupees.` };
    if (v.exShowroom < 100000) return { error: `${variant}: enter the ex-showroom price.` };
    if (v.insurance <= 0 || v.rto <= 0) return { error: `${variant}: enter insurance and RTO charges.` };
    const onRoad = onRoadOf(v);
    if (onRoad <= 0) return { error: `${variant}: the discounts are larger than the price.` };
    lines.push({ quoteId: 0, variant, ...v, onRoad });
  }
  if (lines.length === 0) return { error: "Add a price for at least one variant." };

  const colours: { colour: string; deliveryWeeks: number }[] = [];
  for (const [j, colour] of splitList(row.colours).entries()) {
    const raw = String(fd.get(`colour_${j}`) ?? "").trim();
    if (raw === "" || raw === "na") continue;
    const w = Number(raw);
    if (!Number.isInteger(w) || w < 0 || w > 52) return { error: `${colour}: pick a delivery time.` };
    colours.push({ colour, deliveryWeeks: w });
  }
  const deliveryWeeks = Number(fd.get("deliveryWeeks"));
  const validDays = Number(fd.get("validDays"));
  if (!Number.isInteger(deliveryWeeks) || deliveryWeeks < 0 || deliveryWeeks > 52) return { error: "Pick a usual delivery time." };
  if (!Number.isInteger(validDays) || validDays < 3 || validDays > 60) return { error: "Pick how long the prices stay valid." };
  const note = String(fd.get("note") ?? "").trim().slice(0, 400);

  const headline = [...lines].sort((a, b) => a.onRoad! - b.onRoad!)[0];
  const now = new Date();
  const db = await getDb();
  const values = {
    exShowroom: headline.exShowroom!,
    makerOffer: headline.makerOffer!,
    dealerDiscount: headline.dealerDiscount!,
    insurance: headline.insurance!,
    rto: headline.rto!,
    accessories: headline.accessories!,
    otherCharges: headline.otherCharges!,
    onRoad: headline.onRoad!,
    deliveryWeeks,
    validUntil: new Date(now.getTime() + validDays * 86400000),
    note,
    status: submit ? "submitted" : "draft",
    submittedAt: submit ? now : null,
  };
  const [quote] = await db
    .insert(quotes)
    .values({ groupId: row.groupId, showroomId: ctx.showroom.id, ...values })
    .onConflictDoUpdate({ target: [quotes.groupId, quotes.showroomId], set: values })
    .returning({ id: quotes.id });
  await db.delete(quoteLines).where(eq(quoteLines.quoteId, quote.id));
  await db.insert(quoteLines).values(lines.map((l) => ({ ...l, quoteId: quote.id })));
  await db.delete(quoteColours).where(eq(quoteColours.quoteId, quote.id));
  if (colours.length) await db.insert(quoteColours).values(colours.map((c) => ({ ...c, quoteId: quote.id })));
  await db
    .update(invitations)
    .set({ status: submit ? "quoted" : "accepted", respondedAt: row.inv.respondedAt ?? now })
    .where(eq(invitations.id, id));

  if (submit) {
    await notify(await adminIds(), { title: `Quote received from ${ctx.showroom.name}`, body: `${row.modelName} group #${row.groupId}`, href: `/admin/groups/${row.groupId}` });
  }
  revalidatePath("/showroom", "layout");
  revalidatePath(`/admin/groups/${row.groupId}`);
  return { saved: submit ? "Quote sent. You can still change it until the deadline." : "Draft saved. It is not sent until you press Send quote." };
}

/* --------------------------------------------------------------- referrals */

async function loadReferral(ctx: ShowroomContext, id: number) {
  const db = await getDb();
  const [r] = await db.select().from(referrals).where(and(eq(referrals.id, id), eq(referrals.showroomId, ctx.showroom.id)));
  if (!r) return null;
  if (ctx.staffRole === "executive" && r.assignedTo !== ctx.user.id) return null;
  return r;
}

async function buyerOf(membershipId: number) {
  const db = await getDb();
  const [m] = await db.select({ userId: memberships.userId, groupId: memberships.groupId }).from(memberships).where(eq(memberships.id, membershipId));
  return m;
}

export async function acknowledgeReferral(fd: FormData) {
  const ctx = await requireShowroom();
  const r = await loadReferral(ctx, Number(fd.get("referralId")));
  if (!r || r.status !== "sent") return;
  const db = await getDb();
  await db
    .update(referrals)
    .set({ status: "acknowledged", acknowledgedAt: new Date(), assignedTo: r.assignedTo ?? ctx.user.id })
    .where(eq(referrals.id, r.id));
  await logEvent(r.id, "acknowledged", `Acknowledged by ${ctx.user.name}`, ctx.user.id);
  const b = await buyerOf(r.membershipId);
  if (b) await notify([b.userId], { title: `${ctx.showroom.name} has your details`, body: `Reference ${r.code}. Expect a call from their team.`, href: `/groups/${b.groupId}` });
  revalidatePath("/showroom", "layout");
}

export async function assignReferral(fd: FormData) {
  const ctx = await requireShowroom();
  if (ctx.staffRole === "executive") return;
  const r = await loadReferral(ctx, Number(fd.get("referralId")));
  const userId = Number(fd.get("userId"));
  if (!r) return;
  const team = await staffIds(ctx.showroom.id);
  if (!team.includes(userId)) return;
  const db = await getDb();
  await db.update(referrals).set({ assignedTo: userId }).where(eq(referrals.id, r.id));
  const [who] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
  await logEvent(r.id, "assigned", `Assigned to ${who?.name ?? "a team member"}`, ctx.user.id);
  if (userId !== ctx.user.id) await notify([userId], { title: `Buyer ${r.code} assigned to you`, href: `/showroom/buyers/${r.id}` });
  revalidatePath("/showroom", "layout");
}

const NEXT: Record<string, string[]> = {
  acknowledged: ["contacted", "test_drive", "booked", "lost"],
  contacted: ["test_drive", "booked", "lost"],
  test_drive: ["booked", "lost"],
  booked: ["delivered", "lost"],
  expired: ["booked"],
};

export async function updateReferral(_prev: PortalState, fd: FormData): Promise<PortalState> {
  const ctx = await requireShowroom();
  const r = await loadReferral(ctx, Number(fd.get("referralId")));
  if (!r) return { error: "Buyer not found." };
  const status = String(fd.get("status"));
  if (!(NEXT[r.status] ?? []).includes(status)) return { error: `A buyer who is "${REFERRAL_LABEL[r.status]}" can't move to "${REFERRAL_LABEL[status] ?? status}".` };
  const db = await getDb();
  const b = await buyerOf(r.membershipId);

  if (status === "booked") {
    const bookingNo = String(fd.get("bookingNo") ?? "").trim().slice(0, 40);
    if (bookingNo.length < 3) return { error: "Enter the booking or order number from your system." };
    await confirmBooking(r.id, bookingNo, ctx.user.id);
    if (b) await notify([b.userId], { title: "Booking recorded", body: `${ctx.showroom.name} recorded booking ${bookingNo}.`, href: `/groups/${b.groupId}` });
    revalidatePath("/", "layout");
    return { saved: "Booking recorded." };
  }
  if (status === "lost") {
    const reason = String(fd.get("lostReason") ?? "");
    if (!LOST_REASONS.includes(reason)) return { error: "Pick why the sale didn't happen." };
    if (r.status === "booked") return { error: "This buyer has booked. Ask GroupDeal support to cancel a booking." };
    await db.update(referrals).set({ status: "lost", lostReason: reason }).where(eq(referrals.id, r.id));
    await logEvent(r.id, "lost", reason, ctx.user.id);
  } else if (status === "delivered") {
    await db.update(referrals).set({ status: "delivered", deliveredAt: new Date() }).where(eq(referrals.id, r.id));
    await db.update(memberships).set({ stage: "delivered" }).where(eq(memberships.id, r.membershipId));
    await logEvent(r.id, "delivered", "Car delivered", ctx.user.id);
    if (b) await notify([b.userId], { title: "Enjoy your new car", body: `${ctx.showroom.name} marked your car as delivered.`, href: `/groups/${b.groupId}` });
  } else {
    await db.update(referrals).set({ status }).where(eq(referrals.id, r.id));
    await logEvent(r.id, status, "", ctx.user.id);
  }
  revalidatePath("/", "layout");
  return { saved: `Marked as ${REFERRAL_LABEL[status].toLowerCase()}.` };
}

export async function respondDispute(_prev: PortalState, fd: FormData): Promise<PortalState> {
  const ctx = await requireShowroom();
  if (ctx.staffRole === "executive") return { error: "Only the owner or a manager can answer this." };
  const db = await getDb();
  const [d] = await db
    .select({ d: disputes, r: referrals })
    .from(disputes)
    .innerJoin(referrals, eq(disputes.referralId, referrals.id))
    .where(and(eq(disputes.id, Number(fd.get("disputeId"))), eq(referrals.showroomId, ctx.showroom.id)));
  if (!d || d.d.status !== "open") return { error: "This has already been answered." };
  const decision = String(fd.get("decision"));
  const response = String(fd.get("response") ?? "").trim().slice(0, 500);
  if (decision === "confirm") {
    await confirmBooking(d.r.id, String(fd.get("bookingNo") ?? "").trim().slice(0, 40) || d.r.buyerBookingNo, ctx.user.id, "Showroom confirmed the booking the buyer reported");
    await db.update(disputes).set({ showroomResponse: response, respondedAt: new Date() }).where(eq(disputes.id, d.d.id));
  } else {
    if (response.length < 10) return { error: "Explain in a sentence why this booking isn't yours." };
    await db.update(disputes).set({ status: "rejected", showroomResponse: response, respondedAt: new Date() }).where(eq(disputes.id, d.d.id));
    await logEvent(d.r.id, "dispute_rejected", response, ctx.user.id);
    await notify(await adminIds(), { title: `${ctx.showroom.name} disputes booking ${d.r.code}`, body: response, href: "/admin/referrals" });
  }
  revalidatePath("/", "layout");
  return { saved: decision === "confirm" ? "Booking confirmed." : "Your answer was sent to GroupDeal. We'll decide within 7 days." };
}

/* ------------------------------------------------------------ team, settings */

const staffSchema = z.object({
  name: z.string().trim().min(2, "Enter their full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone,
  password: z.string().min(8, "Use at least 8 characters for the password").max(100),
  role: z.enum(["manager", "executive"]),
});

export async function addStaff(_prev: PortalState, fd: FormData): Promise<PortalState> {
  const ctx = await requireShowroom({ owner: true });
  const parsed = staffSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email));
  if (existing) return { error: "Someone already uses this email. Ask them for a different one." };
  const [u] = await db
    .insert(users)
    .values({ name: d.name, email: d.email, phone: d.phone, passwordHash: await bcrypt.hash(d.password, 10), role: "showroom", cityId: ctx.showroom.cityId, locality: ctx.showroom.locality })
    .returning({ id: users.id });
  await db.insert(showroomStaff).values({ showroomId: ctx.showroom.id, userId: u.id, role: d.role });
  revalidatePath("/showroom/team");
  return { saved: `${d.name} can now sign in with ${d.email}.` };
}

export async function removeStaff(fd: FormData) {
  const ctx = await requireShowroom({ owner: true });
  const userId = Number(fd.get("userId"));
  if (userId === ctx.user.id) return;
  const db = await getDb();
  const [s] = await db.select().from(showroomStaff).where(and(eq(showroomStaff.userId, userId), eq(showroomStaff.showroomId, ctx.showroom.id), ne(showroomStaff.role, "owner")));
  if (!s) return;
  // Their open buyers go back to the shared list; the account is turned into a plain buyer account.
  await db.update(referrals).set({ assignedTo: null }).where(and(eq(referrals.showroomId, ctx.showroom.id), eq(referrals.assignedTo, userId)));
  await db.delete(showroomStaff).where(eq(showroomStaff.id, s.id));
  await db.update(users).set({ role: "buyer" }).where(eq(users.id, userId));
  revalidatePath("/showroom", "layout");
}

const settingsSchema = z.object({
  phone: z.string().trim().min(6, "Enter the showroom's phone number").max(20),
  locality: z.string().trim().min(2, "Enter the showroom's area").max(80),
  address: z.string().trim().max(300).default(""),
  gstNumber: gstin,
  dealerCode: z.string().trim().max(40).default(""),
});

export async function updateShowroomSettings(_prev: PortalState, fd: FormData): Promise<PortalState> {
  const ctx = await requireShowroom({ owner: true, approved: false });
  const parsed = settingsSchema.safeParse(Object.fromEntries([...fd].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const upload = await readUpload(fd.get("document"));
  if (upload.error) return { error: upload.error };
  const db = await getDb();
  await db.update(showrooms).set(parsed.data).where(eq(showrooms.id, ctx.showroom.id));
  if (upload.file) {
    await db.insert(showroomDocuments).values({ showroomId: ctx.showroom.id, fileName: upload.file.name, dataUrl: upload.file.dataUrl });
    if (ctx.showroom.status === "pending") {
      await notify(await adminIds(), { title: `${ctx.showroom.name} uploaded a document`, href: `/admin/showrooms/${ctx.showroom.id}` });
    }
  }
  revalidatePath("/showroom", "layout");
  return { saved: upload.file ? "Saved, and the document was uploaded." : "Saved." };
}

/* ----------------------------------------------------------- notifications */

export async function markNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  const db = await getDb();
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
  revalidatePath("/", "layout");
}
