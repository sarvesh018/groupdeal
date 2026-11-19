import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { expireReferrals } from "./portal";
import { monthKey } from "./rules";
import { referralRows } from "./showroom-queries";

const { showrooms, brands, cities, showroomStaff, showroomDocuments, users, invitations, quotes, referrals, disputes, fees, feeBands, statements, bookingProofs, groups, models } = schema;

export async function adminShowroom(id: number) {
  const db = await getDb();
  const [row] = await db
    .select({ s: showrooms, brand: brands.name, city: cities.name })
    .from(showrooms)
    .innerJoin(brands, eq(showrooms.brandId, brands.id))
    .innerJoin(cities, eq(showrooms.cityId, cities.id))
    .where(eq(showrooms.id, id));
  if (!row) return null;
  const staff = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: showroomStaff.role })
    .from(showroomStaff)
    .innerJoin(users, eq(showroomStaff.userId, users.id))
    .where(eq(showroomStaff.showroomId, id))
    .orderBy(asc(showroomStaff.id));
  const docs = await db.select().from(showroomDocuments).where(eq(showroomDocuments.showroomId, id)).orderBy(asc(showroomDocuments.id));
  const byStatus = await db.select({ status: referrals.status, n: sql<number>`count(*)::int` }).from(referrals).where(eq(referrals.showroomId, id)).groupBy(referrals.status);
  const [feeSum] = await db
    .select({ billed: sql<number>`coalesce(sum(case when ${fees.status} in ('due','paid') then ${fees.amount} end),0)::int`, waived: sql<number>`count(*) filter (where ${fees.status} = 'waived')::int` })
    .from(fees)
    .where(eq(fees.showroomId, id));
  const [inv] = await db
    .select({ invited: sql<number>`count(*)::int`, quoted: sql<number>`count(*) filter (where ${invitations.status} = 'quoted')::int` })
    .from(invitations)
    .where(eq(invitations.showroomId, id));
  return { ...row, staff, docs, byStatus, fees: feeSum, invitations: inv };
}

/** Invitations for a group, and the verified showrooms that could still be invited. */
export async function groupInvitations(groupId: number, cityId: number, brandId: number) {
  const db = await getDb();
  const sent = await db
    .select({ id: invitations.id, status: invitations.status, deadline: invitations.deadline, showroomId: showrooms.id, showroom: showrooms.name, locality: showrooms.locality, quoteStatus: quotes.status })
    .from(invitations)
    .innerJoin(showrooms, eq(invitations.showroomId, showrooms.id))
    .leftJoin(quotes, and(eq(quotes.groupId, invitations.groupId), eq(quotes.showroomId, invitations.showroomId)))
    .where(eq(invitations.groupId, groupId))
    .orderBy(asc(showrooms.name));
  const eligible = await db
    .select({ id: showrooms.id, name: showrooms.name, locality: showrooms.locality })
    .from(showrooms)
    .where(and(eq(showrooms.cityId, cityId), eq(showrooms.brandId, brandId), eq(showrooms.status, "approved")))
    .orderBy(asc(showrooms.name));
  return { sent, eligible };
}

/** Referral codes per membership in a group, for the admin member table. */
export async function groupReferrals(groupId: number) {
  const db = await getDb();
  return db
    .select({ id: referrals.id, membershipId: referrals.membershipId, code: referrals.code, status: referrals.status, showroom: showrooms.name })
    .from(referrals)
    .innerJoin(showrooms, eq(referrals.showroomId, showrooms.id))
    .where(eq(referrals.groupId, groupId));
}

export async function adminReferrals() {
  await expireReferrals();
  const db = await getDb();
  const rows = await referralRows(undefined);
  const roomIds = [...new Set(rows.map((r) => r.showroomId))];
  const rooms = roomIds.length ? await db.select({ id: showrooms.id, name: showrooms.name }).from(showrooms).where(inArray(showrooms.id, roomIds)) : [];
  const disputeRows = await db
    .select({ d: disputes, code: referrals.code, referralId: referrals.id, buyerBookingNo: referrals.buyerBookingNo, showroom: showrooms.name, buyer: users.name, model: models.name })
    .from(disputes)
    .innerJoin(referrals, eq(disputes.referralId, referrals.id))
    .innerJoin(showrooms, eq(referrals.showroomId, showrooms.id))
    .innerJoin(schema.memberships, eq(referrals.membershipId, schema.memberships.id))
    .innerJoin(users, eq(schema.memberships.userId, users.id))
    .innerJoin(groups, eq(referrals.groupId, groups.id))
    .innerJoin(models, eq(groups.modelId, models.id))
    .orderBy(desc(disputes.createdAt));
  const proofIds = disputeRows.map((d) => d.referralId);
  const proofs = proofIds.length
    ? await db.select({ id: bookingProofs.id, referralId: bookingProofs.referralId, fileName: bookingProofs.fileName }).from(bookingProofs).where(inArray(bookingProofs.referralId, proofIds))
    : [];
  return {
    rows: rows.map((r) => ({ ...r, showroom: rooms.find((x) => x.id === r.showroomId)?.name ?? "" })),
    disputes: disputeRows.map((d) => ({
      ...d,
      proofs: proofs.filter((p) => p.referralId === d.referralId),
      // The showroom disagreed, or didn't answer in time: the admin decides.
      needsDecision: d.d.status === "rejected" || (d.d.status === "open" && d.d.respondBy.getTime() < Date.now()),
    })),
  };
}

export async function adminBilling() {
  const db = await getDb();
  const bands = await db.select().from(feeBands).orderBy(asc(feeBands.minPrice));
  const feeRows = await db
    .select({
      id: fees.id,
      amount: fees.amount,
      gst: fees.gst,
      status: fees.status,
      note: fees.note,
      createdAt: fees.createdAt,
      statementId: fees.statementId,
      code: referrals.code,
      showroom: showrooms.name,
      showroomId: showrooms.id,
    })
    .from(fees)
    .innerJoin(referrals, eq(fees.referralId, referrals.id))
    .innerJoin(showrooms, eq(fees.showroomId, showrooms.id))
    .orderBy(desc(fees.createdAt));
  const statementRows = await db
    .select({ st: statements, showroom: showrooms.name })
    .from(statements)
    .innerJoin(showrooms, eq(statements.showroomId, showrooms.id))
    .orderBy(desc(statements.month), asc(showrooms.name));
  // Months with any fee, newest first, to bill or review.
  const months = [...new Set(feeRows.map((f) => monthKey(f.createdAt)))].sort().reverse();
  return { bands, feeRows: feeRows.map((f) => ({ ...f, month: monthKey(f.createdAt) })), statementRows, months };
}

/** Referral and billing numbers for the dashboard. */
export async function partnerKpis() {
  const db = await getDb();
  const [s] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${showrooms.status} = 'pending')::int`,
      approved: sql<number>`count(*) filter (where ${showrooms.status} = 'approved')::int`,
    })
    .from(showrooms);
  const [r] = await db
    .select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where ${referrals.status} in ('sent','acknowledged','contacted','test_drive'))::int`,
      unacknowledged: sql<number>`count(*) filter (where ${referrals.status} = 'sent')::int`,
      booked: sql<number>`count(*) filter (where ${referrals.status} in ('booked','delivered'))::int`,
    })
    .from(referrals);
  const [f] = await db
    .select({
      earned: sql<number>`coalesce(sum(${fees.amount}) filter (where ${fees.status} in ('due','paid')),0)::int`,
      paid: sql<number>`coalesce(sum(${fees.amount}) filter (where ${fees.status} = 'paid'),0)::int`,
    })
    .from(fees);
  const [d] = await db.select({ open: sql<number>`count(*) filter (where ${disputes.status} in ('open','rejected'))::int` }).from(disputes);
  return { ...s, ...r, ...f, disputes: d.open };
}
