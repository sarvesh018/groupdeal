import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { expireReferrals } from "./portal";
import { splitList } from "./rules";

const {
  cities, brands, models, showrooms, users, groups, memberships, quotes, quoteLines, quoteColours, invitations,
  referrals, referralEvents, bookingProofs, fees, statements, disputes, showroomStaff, notifications,
} = schema;

const memberCount = sql<number>`(select count(*)::int from memberships m where m.group_id = ${groups.id})`;

/** Invitations a showroom can still act on: not declined, deadline ahead, group still collecting quotes. */
export function invitationOpen(inv: { status: string; deadline: Date }, groupStatus: string) {
  return inv.status !== "declined" && inv.deadline.getTime() > Date.now() && groupStatus === "negotiating";
}

export async function showroomHome(showroomId: number, userId: number, executive: boolean) {
  const db = await getDb();
  await expireReferrals();
  const now = new Date();
  const [inv] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(invitations)
    .innerJoin(groups, eq(invitations.groupId, groups.id))
    .where(and(eq(invitations.showroomId, showroomId), inArray(invitations.status, ["invited", "accepted"]), eq(groups.status, "negotiating"), gt(invitations.deadline, now)));
  const refScope = executive ? and(eq(referrals.showroomId, showroomId), eq(referrals.assignedTo, userId)) : eq(referrals.showroomId, showroomId);
  const byStatus = await db.select({ status: referrals.status, n: sql<number>`count(*)::int` }).from(referrals).where(refScope).groupBy(referrals.status);
  const [disp] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(disputes)
    .innerJoin(referrals, eq(disputes.referralId, referrals.id))
    .where(and(eq(referrals.showroomId, showroomId), eq(disputes.status, "open")));
  const [due] = await db
    .select({ n: sql<number>`coalesce(sum(${fees.amount} + ${fees.gst}), 0)::int` })
    .from(fees)
    .where(and(eq(fees.showroomId, showroomId), eq(fees.status, "due")));
  const [used] = await db.select({ n: sql<number>`count(*)::int` }).from(fees).where(eq(fees.showroomId, showroomId));
  const recent = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(6);
  const count = (s: string) => byStatus.find((x) => x.status === s)?.n ?? 0;
  return {
    openInvitations: inv?.n ?? 0,
    newBuyers: count("sent"),
    inProgress: count("acknowledged") + count("contacted") + count("test_drive"),
    booked: count("booked") + count("delivered"),
    openDisputes: disp?.n ?? 0,
    amountDue: due?.n ?? 0,
    bookingsCharged: used?.n ?? 0,
    recent,
  };
}

export async function listInvitations(showroomId: number) {
  const db = await getDb();
  return db
    .select({
      id: invitations.id,
      status: invitations.status,
      deadline: invitations.deadline,
      invitedAt: invitations.invitedAt,
      groupId: groups.id,
      groupStatus: groups.status,
      model: models.name,
      brand: brands.name,
      city: cities.name,
      members: memberCount,
      quoteStatus: quotes.status,
    })
    .from(invitations)
    .innerJoin(groups, eq(invitations.groupId, groups.id))
    .innerJoin(models, eq(groups.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .innerJoin(cities, eq(groups.cityId, cities.id))
    .leftJoin(quotes, and(eq(quotes.groupId, groups.id), eq(quotes.showroomId, showroomId)))
    .where(eq(invitations.showroomId, showroomId))
    .orderBy(desc(invitations.invitedAt));
}

export type Tally = { label: string; n: number }[];
const tally = (values: string[], order?: string[]): Tally => {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  const rows = [...m].map(([label, n]) => ({ label, n }));
  return order
    ? rows.sort((a, b) => (order.indexOf(a.label) + 1 || 99) - (order.indexOf(b.label) + 1 || 99))
    : rows.sort((a, b) => b.n - a.n);
};

/** What the group wants, without names or contact details. */
export async function demandSummary(groupId: number, variants: string[], colours: string[]) {
  const db = await getDb();
  const rows = await db
    .select({
      variant: memberships.variant,
      colour: memberships.colour,
      altColours: memberships.altColours,
      transmission: memberships.transmission,
      features: memberships.features,
      flexibleTrim: memberships.flexibleTrim,
      purchaseMonth: memberships.purchaseMonth,
      stage: memberships.stage,
    })
    .from(memberships)
    .where(eq(memberships.groupId, groupId));
  return {
    members: rows.length,
    verified: rows.filter((r) => r.stage !== "interested").length,
    flexible: rows.filter((r) => r.flexibleTrim).length,
    variants: tally(rows.map((r) => r.variant || "No preference"), [...variants, "No preference"]),
    colours: tally(rows.map((r) => r.colour || "No preference"), [...colours, "No preference"]),
    alsoOk: tally(rows.flatMap((r) => splitList(r.altColours))),
    transmission: tally(rows.map((r) => r.transmission || "Either")),
    features: tally(rows.flatMap((r) => splitList(r.features))),
    months: tally(rows.map((r) => r.purchaseMonth || "Not sure yet")),
  };
}

export async function getInvitation(id: number, showroomId: number) {
  const db = await getDb();
  const [row] = await db
    .select({
      inv: invitations,
      group: groups,
      model: models.name,
      variants: models.variants,
      colours: models.colours,
      priceMin: models.priceMin,
      priceMax: models.priceMax,
      bodyType: models.bodyType,
      brand: brands.name,
      city: cities.name,
    })
    .from(invitations)
    .innerJoin(groups, eq(invitations.groupId, groups.id))
    .innerJoin(models, eq(groups.modelId, models.id))
    .innerJoin(brands, eq(models.brandId, brands.id))
    .innerJoin(cities, eq(groups.cityId, cities.id))
    .where(and(eq(invitations.id, id), eq(invitations.showroomId, showroomId)));
  if (!row) return null;
  const variants = splitList(row.variants);
  const colours = splitList(row.colours);
  const [quote] = await db.select().from(quotes).where(and(eq(quotes.groupId, row.group.id), eq(quotes.showroomId, showroomId)));
  const lines = quote ? await db.select().from(quoteLines).where(eq(quoteLines.quoteId, quote.id)).orderBy(asc(quoteLines.id)) : [];
  const colourRows = quote ? await db.select().from(quoteColours).where(eq(quoteColours.quoteId, quote.id)) : [];
  const demand = await demandSummary(row.group.id, variants, colours);
  return { ...row, variants, colours, quote: quote ?? null, lines, colourRows, demand };
}

export async function listShowroomQuotes(showroomId: number) {
  const db = await getDb();
  const rows = await db
    .select({
      id: quotes.id,
      status: quotes.status,
      onRoad: quotes.onRoad,
      submittedAt: quotes.submittedAt,
      validUntil: quotes.validUntil,
      groupId: groups.id,
      groupStatus: groups.status,
      model: models.name,
      city: cities.name,
      members: memberCount,
      picks: sql<number>`(select count(*)::int from memberships m where m.accepted_quote_id = ${quotes.id})`,
      picksElsewhere: sql<number>`(select count(*)::int from memberships m where m.group_id = ${groups.id} and m.accepted_quote_id is not null and m.accepted_quote_id <> ${quotes.id})`,
      rivals: sql<number>`(select count(*)::int from quotes q2 where q2.group_id = ${groups.id} and q2.status = 'submitted')`,
      rank: sql<number>`(select count(*)::int + 1 from quotes q2 where q2.group_id = ${groups.id} and q2.status = 'submitted' and q2.on_road < ${quotes.onRoad})`,
    })
    .from(quotes)
    .innerJoin(groups, eq(quotes.groupId, groups.id))
    .innerJoin(models, eq(groups.modelId, models.id))
    .innerJoin(cities, eq(groups.cityId, cities.id))
    .where(eq(quotes.showroomId, showroomId))
    .orderBy(desc(quotes.createdAt));
  // Rank and rival counts only once offers are released, so quotes stay sealed.
  return rows.map((r) => {
    const released = r.groupStatus === "offers" || r.groupStatus === "completed";
    return { ...r, released, rank: released ? r.rank : null, rivals: released ? r.rivals : null };
  });
}

const referralFields = {
  id: referrals.id,
  code: referrals.code,
  status: referrals.status,
  sentAt: referrals.sentAt,
  acknowledgedAt: referrals.acknowledgedAt,
  expiresAt: referrals.expiresAt,
  bookingNo: referrals.bookingNo,
  bookedAt: referrals.bookedAt,
  deliveredAt: referrals.deliveredAt,
  lostReason: referrals.lostReason,
  assignedTo: referrals.assignedTo,
  buyerReportedAt: referrals.buyerReportedAt,
  buyerBookingNo: referrals.buyerBookingNo,
  quoteId: referrals.quoteId,
  groupId: referrals.groupId,
  showroomId: referrals.showroomId,
  membershipId: referrals.membershipId,
  name: users.name,
  phone: users.phone,
  email: users.email,
  locality: users.locality,
  variant: memberships.variant,
  colour: memberships.colour,
  altColours: memberships.altColours,
  transmission: memberships.transmission,
  features: memberships.features,
  purchaseMonth: memberships.purchaseMonth,
  note: memberships.note,
  model: models.name,
  brand: brands.name,
  city: cities.name,
};

/** Drizzle queries are "thenable", so the where clause is applied before anything awaits them. */
async function referralRows(where: ReturnType<typeof and>) {
  const db = await getDb();
  return db
      .select(referralFields)
      .from(referrals)
      .innerJoin(memberships, eq(referrals.membershipId, memberships.id))
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(groups, eq(referrals.groupId, groups.id))
      .innerJoin(models, eq(groups.modelId, models.id))
      .innerJoin(brands, eq(models.brandId, brands.id))
      .innerJoin(cities, eq(groups.cityId, cities.id))
      .where(where)
      .orderBy(desc(referrals.sentAt));
}


/** Contact details stay hidden until the showroom acknowledges the referral. */
function mask<T extends { acknowledgedAt: Date | null; phone: string; email: string; name: string }>(r: T) {
  if (r.acknowledgedAt) return { ...r, hidden: false };
  return { ...r, hidden: true, phone: "", email: "", name: r.name.split(" ")[0] };
}

export async function listShowroomReferrals(showroomId: number, assignedTo?: number) {
  await expireReferrals();
  const rows = await referralRows(assignedTo ? and(eq(referrals.showroomId, showroomId), eq(referrals.assignedTo, assignedTo)) : and(eq(referrals.showroomId, showroomId)));
  return rows.map(mask);
}

export async function getShowroomReferral(id: number, showroomId: number) {
  await expireReferrals();
  const [row] = await referralRows(and(eq(referrals.id, id), eq(referrals.showroomId, showroomId)));
  if (!row) return null;
  return { ...mask(row), ...(await referralExtras(row.id, row.quoteId, row.variant, row.colour, row.altColours)) };
}

/** Timeline, receipts, dispute and the price the buyer was quoted. */
export async function referralExtras(id: number, quoteId: number | null, variant: string, colour: string, altColours: string) {
  const db = await getDb();
  const events = await db
    .select({ id: referralEvents.id, kind: referralEvents.kind, note: referralEvents.note, at: referralEvents.at, actor: users.name })
    .from(referralEvents)
    .leftJoin(users, eq(referralEvents.actorId, users.id))
    .where(eq(referralEvents.referralId, id))
    .orderBy(asc(referralEvents.at), asc(referralEvents.id));
  const proofs = await db.select({ id: bookingProofs.id, fileName: bookingProofs.fileName, createdAt: bookingProofs.createdAt }).from(bookingProofs).where(eq(bookingProofs.referralId, id));
  const [dispute] = await db.select().from(disputes).where(eq(disputes.referralId, id)).orderBy(desc(disputes.id)).limit(1);
  const [fee] = await db.select().from(fees).where(eq(fees.referralId, id));
  const { lineForMember, deliveryForMember } = await import("./rules");
  let price: { variant: string; onRoad: number; exShowroom: number; weeks: number; colour: string | null } | null = null;
  if (quoteId) {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
    const lines = await db.select().from(quoteLines).where(eq(quoteLines.quoteId, quoteId));
    const cols = await db.select().from(quoteColours).where(eq(quoteColours.quoteId, quoteId));
    const { line } = lineForMember(lines, variant);
    const d = deliveryForMember(cols, quote?.deliveryWeeks ?? 0, colour, splitList(altColours));
    if (line) price = { variant: line.variant, onRoad: line.onRoad, exShowroom: line.exShowroom, weeks: d.weeks, colour: d.colour };
  }
  return { events, proofs, dispute: dispute ?? null, fee: fee ?? null, price };
}

export async function listStaff(showroomId: number) {
  const db = await getDb();
  return db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: showroomStaff.role, since: showroomStaff.createdAt })
    .from(showroomStaff)
    .innerJoin(users, eq(showroomStaff.userId, users.id))
    .where(eq(showroomStaff.showroomId, showroomId))
    .orderBy(asc(showroomStaff.id));
}

export async function showroomBilling(showroomId: number) {
  const db = await getDb();
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
      referralId: referrals.id,
      model: models.name,
    })
    .from(fees)
    .innerJoin(referrals, eq(fees.referralId, referrals.id))
    .innerJoin(groups, eq(referrals.groupId, groups.id))
    .innerJoin(models, eq(groups.modelId, models.id))
    .where(eq(fees.showroomId, showroomId))
    .orderBy(desc(fees.createdAt));
  const statementRows = await db.select().from(statements).where(eq(statements.showroomId, showroomId)).orderBy(desc(statements.month));
  const disputeRows = await db
    .select({
      id: disputes.id,
      status: disputes.status,
      respondBy: disputes.respondBy,
      showroomResponse: disputes.showroomResponse,
      resolutionNote: disputes.resolutionNote,
      createdAt: disputes.createdAt,
      referralId: referrals.id,
      code: referrals.code,
      buyerBookingNo: referrals.buyerBookingNo,
      model: models.name,
    })
    .from(disputes)
    .innerJoin(referrals, eq(disputes.referralId, referrals.id))
    .innerJoin(groups, eq(referrals.groupId, groups.id))
    .innerJoin(models, eq(groups.modelId, models.id))
    .where(eq(referrals.showroomId, showroomId))
    .orderBy(desc(disputes.createdAt));
  return { feeRows, statementRows, disputeRows };
}

/** One statement with its line items, for the invoice page. */
export async function getStatement(id: number) {
  const db = await getDb();
  const [st] = await db
    .select({ st: statements, showroom: showrooms, brand: brands.name, city: cities.name, state: cities.state })
    .from(statements)
    .innerJoin(showrooms, eq(statements.showroomId, showrooms.id))
    .innerJoin(brands, eq(showrooms.brandId, brands.id))
    .innerJoin(cities, eq(showrooms.cityId, cities.id))
    .where(eq(statements.id, id));
  if (!st) return null;
  const items = await db
    .select({ id: fees.id, amount: fees.amount, gst: fees.gst, code: referrals.code, bookingNo: referrals.bookingNo, bookedAt: referrals.bookedAt, model: models.name })
    .from(fees)
    .innerJoin(referrals, eq(fees.referralId, referrals.id))
    .innerJoin(groups, eq(referrals.groupId, groups.id))
    .innerJoin(models, eq(groups.modelId, models.id))
    .where(eq(fees.statementId, id))
    .orderBy(asc(referrals.bookedAt));
  return { ...st, items };
}

export async function listNotifications(userId: number) {
  const db = await getDb();
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(100);
}

export async function unreadCount(userId: number) {
  const db = await getDb();
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return r?.n ?? 0;
}

export type ReferralRow = Awaited<ReturnType<typeof listShowroomReferrals>>[number];
export { referralRows };
