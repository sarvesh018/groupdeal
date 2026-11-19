import "server-only";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DISPUTE_DAYS, OPEN_REFERRAL, REFERRAL_DAYS, feeForPrice, gstOn, lineForMember, referralCode } from "./rules";

const { referrals, referralEvents, notifications, showroomStaff, users, fees, feeBands, quoteLines, memberships, showrooms, disputes } = schema;
const DAY = 86400000;

export type Notice = { title: string; body?: string; href?: string };

/** In-app notifications. Never throws: a failed notice must not break the action that sent it. */
export async function notify(userIds: number[], n: Notice) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;
  try {
    const db = await getDb();
    await db.insert(notifications).values(ids.map((userId) => ({ userId, title: n.title, body: n.body ?? "", href: n.href ?? "" })));
  } catch (e) {
    console.error("notify failed", e);
  }
}

export async function staffIds(showroomId: number, roles?: string[]) {
  const db = await getDb();
  const rows = await db
    .select({ id: showroomStaff.userId })
    .from(showroomStaff)
    .where(roles ? and(eq(showroomStaff.showroomId, showroomId), inArray(showroomStaff.role, roles)) : eq(showroomStaff.showroomId, showroomId));
  return rows.map((r) => r.id);
}

export async function adminIds() {
  const db = await getDb();
  return (await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"))).map((r) => r.id);
}

export async function logEvent(referralId: number, kind: string, note = "", actorId: number | null = null) {
  const db = await getDb();
  await db.insert(referralEvents).values({ referralId, kind, note, actorId });
}

/**
 * Referrals are valid for 90 days. Instead of a background job, open referrals past
 * their date are marked expired whenever someone looks at a referral list.
 */
export async function expireReferrals() {
  const db = await getDb();
  const gone = await db
    .update(referrals)
    .set({ status: "expired" })
    .where(and(inArray(referrals.status, [...OPEN_REFERRAL]), lt(referrals.expiresAt, new Date())))
    .returning({ id: referrals.id });
  for (const r of gone) await logEvent(r.id, "expired", `No booking within ${REFERRAL_DAYS} days`);
}

/**
 * A member picks a showroom's offer and agrees to share their contact details.
 * Opens (or reopens) the referral to that showroom and withdraws any other open one.
 */
export async function openReferral(opts: { membershipId: number; groupId: number; showroomId: number; quoteId: number; actorId: number }) {
  const db = await getDb();
  const now = new Date();

  const others = await db
    .update(referrals)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(referrals.membershipId, opts.membershipId),
        sql`${referrals.showroomId} <> ${opts.showroomId}`,
        inArray(referrals.status, [...OPEN_REFERRAL]),
      ),
    )
    .returning({ id: referrals.id, showroomId: referrals.showroomId, code: referrals.code });
  for (const o of others) {
    await logEvent(o.id, "cancelled", "Buyer picked another showroom's offer", opts.actorId);
    await notify(await staffIds(o.showroomId), { title: `Referral ${o.code} withdrawn`, body: "The buyer picked another offer.", href: `/showroom/buyers/${o.id}` });
  }

  const values = {
    quoteId: opts.quoteId,
    status: "sent",
    consentAt: now,
    sentAt: now,
    expiresAt: new Date(now.getTime() + REFERRAL_DAYS * DAY),
    acknowledgedAt: null,
    assignedTo: null,
    lostReason: "",
  };
  const [existing] = await db
    .select()
    .from(referrals)
    .where(and(eq(referrals.membershipId, opts.membershipId), eq(referrals.showroomId, opts.showroomId)));

  let id: number;
  let code: string;
  if (existing) {
    // A referral that is already moving forward stays as it is.
    if (["booked", "delivered"].includes(existing.status) || (OPEN_REFERRAL as readonly string[]).includes(existing.status)) {
      if (existing.quoteId !== opts.quoteId) await db.update(referrals).set({ quoteId: opts.quoteId }).where(eq(referrals.id, existing.id));
      return existing.id;
    }
    await db.update(referrals).set(values).where(eq(referrals.id, existing.id));
    id = existing.id;
    code = existing.code;
    await logEvent(id, "reopened", "Buyer picked this offer again", opts.actorId);
  } else {
    code = referralCode(opts.groupId, opts.membershipId);
    const [row] = await db
      .insert(referrals)
      .values({ ...values, code, membershipId: opts.membershipId, groupId: opts.groupId, showroomId: opts.showroomId })
      .returning({ id: referrals.id });
    id = row.id;
    await logEvent(id, "created", "Buyer picked this offer and agreed to share contact details", opts.actorId);
  }
  await notify(await staffIds(opts.showroomId, ["owner", "manager"]), {
    title: `New buyer ${code}`,
    body: "A group member picked your offer. Acknowledge to see their contact details.",
    href: `/showroom/buyers/${id}`,
  });
  return id;
}

/** The member withdraws their pick. Booked referrals are left alone. */
export async function cancelOpenReferrals(membershipId: number, actorId: number) {
  const db = await getDb();
  const rows = await db
    .update(referrals)
    .set({ status: "cancelled" })
    .where(and(eq(referrals.membershipId, membershipId), inArray(referrals.status, [...OPEN_REFERRAL])))
    .returning({ id: referrals.id, showroomId: referrals.showroomId, code: referrals.code });
  for (const r of rows) {
    await logEvent(r.id, "cancelled", "Buyer withdrew their pick", actorId);
    await notify(await staffIds(r.showroomId), { title: `Referral ${r.code} withdrawn`, body: "The buyer changed their mind.", href: `/showroom/buyers/${r.id}` });
  }
}

/**
 * Record a confirmed booking: referral and membership move to booked, and the
 * showroom's fee is created. The first bookings in the free trial are waived.
 * Safe to call twice: a referral only ever gets one fee.
 */
export async function confirmBooking(referralId: number, bookingNo: string, actorId: number | null, note = "") {
  const db = await getDb();
  const [r] = await db.select().from(referrals).where(eq(referrals.id, referralId));
  if (!r) return;
  const now = new Date();
  if (r.status !== "booked" && r.status !== "delivered") {
    await db.update(referrals).set({ status: "booked", bookingNo: bookingNo || r.bookingNo || r.buyerBookingNo, bookedAt: now }).where(eq(referrals.id, r.id));
    await db.update(memberships).set({ stage: "booked" }).where(and(eq(memberships.id, r.membershipId), inArray(memberships.stage, ["interested", "verified", "accepted"])));
    await logEvent(r.id, "booked", note || (bookingNo ? `Booking number ${bookingNo}` : "Booking confirmed"), actorId);
  }
  await ensureFee(r.id);
  // An open dispute about this booking is settled by the confirmation.
  await db
    .update(disputes)
    .set({ status: "confirmed", resolvedAt: now, resolutionNote: "Showroom confirmed the booking" })
    .where(and(eq(disputes.referralId, r.id), eq(disputes.status, "open")));
}

export async function ensureFee(referralId: number) {
  const db = await getDb();
  const [have] = await db.select({ id: fees.id }).from(fees).where(eq(fees.referralId, referralId));
  if (have) return;
  const [r] = await db
    .select({ id: referrals.id, showroomId: referrals.showroomId, quoteId: referrals.quoteId, variant: memberships.variant, free: showrooms.freeBookings })
    .from(referrals)
    .innerJoin(memberships, eq(referrals.membershipId, memberships.id))
    .innerJoin(showrooms, eq(referrals.showroomId, showrooms.id))
    .where(eq(referrals.id, referralId));
  if (!r) return;
  const lines = r.quoteId ? await db.select().from(quoteLines).where(eq(quoteLines.quoteId, r.quoteId)) : [];
  const ex = lineForMember(lines, r.variant).line?.exShowroom ?? 0;
  const bands = await db.select().from(feeBands).orderBy(asc(feeBands.minPrice));
  const amount = feeForPrice(ex, bands);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(fees).where(eq(fees.showroomId, r.showroomId));
  const waived = n < r.free;
  await db
    .insert(fees)
    .values({
      referralId: r.id,
      showroomId: r.showroomId,
      amount,
      gst: waived ? 0 : gstOn(amount),
      status: waived ? "waived" : "due",
      note: waived ? `Free trial booking ${n + 1} of ${r.free}` : "",
    })
    .onConflictDoNothing();
}

/** The buyer says they booked. If the showroom hasn't recorded it, a dispute opens. */
export async function buyerReportedBooking(referralId: number, actorId: number) {
  const db = await getDb();
  const [r] = await db.select().from(referrals).where(eq(referrals.id, referralId));
  if (!r || r.status === "booked" || r.status === "delivered") return;
  const [open] = await db.select({ id: disputes.id }).from(disputes).where(and(eq(disputes.referralId, r.id), eq(disputes.status, "open")));
  if (open) return;
  await db.insert(disputes).values({ referralId: r.id, respondBy: new Date(Date.now() + DISPUTE_DAYS * DAY) });
  await logEvent(r.id, "buyer_reported", `Buyer reported booking ${r.buyerBookingNo}`.trim(), actorId);
  await notify(await staffIds(r.showroomId, ["owner", "manager"]), {
    title: `Please confirm booking ${r.code}`,
    body: `The buyer says they booked. Confirm or explain within ${DISPUTE_DAYS} days.`,
    href: "/showroom/billing#disputes",
  });
  await notify(await adminIds(), { title: `Booking reported for ${r.code}`, body: "Waiting for the showroom to confirm.", href: "/admin/referrals" });
}
