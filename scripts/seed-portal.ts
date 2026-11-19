/**
 * DUMMY data for the showroom portal, added on top of the base seed:
 * verified showrooms, member choices, rate cards, invitations, referrals,
 * fees, an invoice, a booking to check, and demo showroom logins.
 */
import bcrypt from "bcryptjs";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "../src/db";
import { FEATURES, feeForPrice, gstOn, lineForMember, monthKey, referralCode, splitList } from "../src/lib/rules";

const { showrooms, models, groups, memberships, quotes, quoteLines, quoteColours, invitations, referrals, referralEvents, fees, feeBands, statements, disputes, users, showroomStaff, notifications } = schema;

let s = 7_301_2026;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296);
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const DAY = 86400000;
const r100 = (n: number) => Math.round(n / 100) * 100;
const r1000 = (n: number) => Math.round(n / 1000) * 1000;

export const DEMO_SHOWROOM_EMAIL = "showroom@groupdeal.demo";
export const DEMO_SALES_EMAIL = "sales@groupdeal.demo";
export const DEFAULT_BANDS = [
  { minPrice: 0, maxPrice: 1000000, fee: 2500 },
  { minPrice: 1000000, maxPrice: 2000000, fee: 4000 },
  { minPrice: 2000000, maxPrice: 4000000, fee: 9000 },
  { minPrice: 4000000, maxPrice: null, fee: 18000 },
];

export async function seedPortal() {
  const db = await getDb();
  const now = Date.now();

  if ((await db.select({ id: feeBands.id }).from(feeBands).limit(1)).length === 0) await db.insert(feeBands).values(DEFAULT_BANDS);
  const bands = await db.select().from(feeBands);

  await db.update(showrooms).set({ status: "approved", verifiedAt: new Date(now - 45 * DAY), createdAt: new Date(now - 60 * DAY), gstNumber: sql`'27' || 'AAACG' || lpad(${showrooms.id}::text, 4, '0') || 'K1Z' || chr(65 + (${showrooms.id} % 26))` });

  // What each member wants within the group's car.
  const modelRows = await db.select().from(models);
  const groupRows = await db.select().from(groups);
  const memberRows = await db.select().from(memberships);
  for (const m of memberRows) {
    if (rnd() < 0.15) continue;
    const g = groupRows.find((x) => x.id === m.groupId)!;
    const model = modelRows.find((x) => x.id === g.modelId)!;
    const variants = splitList(model.variants);
    const colours = splitList(model.colours);
    const variant = pick([...variants, variants[variants.length - 1], variants[1] ?? variants[0]]);
    const colour = pick([colours[0], colours[0], colours[1], ...colours]);
    const alt = colours.filter((c) => c !== colour && rnd() < 0.3).slice(0, 2);
    await db
      .update(memberships)
      .set({
        variant,
        colour,
        altColours: alt.join(","),
        transmission: g.transmission !== "Any" ? g.transmission : pick(["", "", "Manual", "Automatic"]),
        features: FEATURES.filter(() => rnd() < 0.18).slice(0, 3).join(","),
        flexibleTrim: rnd() < 0.35,
      })
      .where(eq(memberships.id, m.id));
  }

  // Rate cards: every existing quote gets a price per variant and delivery per colour.
  const quoteRows = await db.select().from(quotes);
  for (const q of quoteRows) {
    const g = groupRows.find((x) => x.id === q.groupId)!;
    const model = modelRows.find((x) => x.id === g.modelId)!;
    const variants = splitList(model.variants);
    const lines = variants.map((variant, i) => {
      const f = 1 + (i - (variants.length - 1) / 2) * 0.13;
      const ex = r1000(q.exShowroom * f);
      const insurance = r100(q.insurance * f);
      const rto = r100(q.rto * f);
      const onRoad = ex - q.makerOffer - q.dealerDiscount + insurance + rto + q.accessories + q.otherCharges;
      return { quoteId: q.id, variant, exShowroom: ex, makerOffer: q.makerOffer, dealerDiscount: q.dealerDiscount, insurance, rto, accessories: q.accessories, otherCharges: q.otherCharges, onRoad };
    });
    await db.insert(quoteLines).values(lines);
    const cheapest = [...lines].sort((a, b) => a.onRoad - b.onRoad)[0];
    await db
      .update(quotes)
      .set({
        exShowroom: cheapest.exShowroom,
        insurance: cheapest.insurance,
        rto: cheapest.rto,
        onRoad: cheapest.onRoad,
        status: "submitted",
        submittedAt: q.createdAt,
      })
      .where(eq(quotes.id, q.id));
    await db.insert(quoteColours).values(splitList(model.colours).map((colour) => ({ quoteId: q.id, colour, deliveryWeeks: pick([0, 0, 1, 2, 2, 3, 4, 6]) })));
    await db.insert(invitations).values({ groupId: q.groupId, showroomId: q.showroomId, status: "quoted", deadline: q.createdAt, invitedAt: new Date(q.createdAt.getTime() - 3 * DAY), respondedAt: q.createdAt }).onConflictDoNothing();
  }

  // Groups collecting quotes: every verified showroom of the brand in that city is invited.
  const roomRows = await db.select().from(showrooms);
  for (const g of groupRows.filter((x) => x.status === "negotiating")) {
    const model = modelRows.find((x) => x.id === g.modelId)!;
    const rooms = roomRows.filter((r) => r.cityId === g.cityId && r.brandId === model.brandId);
    for (const r of rooms) {
      await db.insert(invitations).values({ groupId: g.id, showroomId: r.id, deadline: new Date(now + int(2, 4) * DAY), invitedAt: new Date(now - DAY) }).onConflictDoNothing();
    }
  }

  // Referrals for members who picked an offer, and fees for those who booked.
  const picked = (await db.select().from(memberships)).filter((m) => m.acceptedQuoteId && ["accepted", "booked", "delivered"].includes(m.stage));
  const allQuotes = await db.select().from(quotes);
  const allLines = await db.select().from(quoteLines);
  const usedFree = new Map<number, number>();
  const bookedOrder: { refId: number; showroomId: number; at: Date; ex: number }[] = [];
  for (const m of picked) {
    const q = allQuotes.find((x) => x.id === m.acceptedQuoteId)!;
    const sent = new Date(now - int(8, 55) * DAY);
    const status = m.stage === "booked" ? "booked" : m.stage === "delivered" ? "delivered" : pick(["sent", "acknowledged", "contacted", "contacted", "test_drive"]);
    const ack = status === "sent" ? null : new Date(sent.getTime() + int(1, 20) * 3600000);
    const bookedAt = ["booked", "delivered"].includes(status) ? new Date(Math.min(now - DAY, sent.getTime() + int(4, 20) * DAY)) : null;
    const [ref] = await db
      .insert(referrals)
      .values({
        code: referralCode(m.groupId, m.id),
        membershipId: m.id,
        groupId: m.groupId,
        showroomId: q.showroomId,
        quoteId: q.id,
        status,
        consentAt: sent,
        sentAt: sent,
        acknowledgedAt: ack,
        bookingNo: bookedAt ? `BK${int(100000, 999999)}` : "",
        bookedAt,
        deliveredAt: status === "delivered" && bookedAt ? new Date(Math.min(now, bookedAt.getTime() + int(7, 20) * DAY)) : null,
        expiresAt: new Date(sent.getTime() + 90 * DAY),
      })
      .returning();
    const steps: [string, Date][] = [["created", sent]];
    if (ack) steps.push(["acknowledged", ack]);
    if (["contacted", "test_drive", "booked", "delivered"].includes(status) && ack) steps.push(["contacted", new Date(ack.getTime() + 6 * 3600000)]);
    if (status === "test_drive" && ack) steps.push(["test_drive", new Date(ack.getTime() + 3 * DAY)]);
    if (bookedAt) steps.push(["booked", bookedAt]);
    if (ref.deliveredAt) steps.push(["delivered", ref.deliveredAt]);
    await db.insert(referralEvents).values(steps.map(([kind, at]) => ({ referralId: ref.id, kind, at, note: kind === "booked" ? `Booking number ${ref.bookingNo}` : "" })));
    if (bookedAt) {
      const line = lineForMember(allLines.filter((l) => l.quoteId === q.id), m.variant).line;
      bookedOrder.push({ refId: ref.id, showroomId: q.showroomId, at: bookedAt, ex: line?.exShowroom ?? q.exShowroom });
    }
  }
  bookedOrder.sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const b of bookedOrder) {
    const n = usedFree.get(b.showroomId) ?? 0;
    usedFree.set(b.showroomId, n + 1);
    // Demo showrooms get one free booking, so the billing pages have real amounts to show.
    const waived = n < 1;
    const amount = feeForPrice(b.ex, bands);
    await db.insert(fees).values({ referralId: b.refId, showroomId: b.showroomId, amount, gst: waived ? 0 : gstOn(amount), status: waived ? "waived" : "due", note: waived ? "Free trial booking 1 of 1" : "", createdAt: b.at });
  }
  await db.update(showrooms).set({ freeBookings: 1 });

  // Invoices for last month, half of them paid.
  const lastMonth = monthKey(new Date(new Date().setDate(0)));
  const dueRows = (await db.select().from(fees).where(eq(fees.status, "due"))).filter((f) => monthKey(f.createdAt) === lastMonth);
  const byRoom = new Map<number, typeof dueRows>();
  for (const f of dueRows) byRoom.set(f.showroomId, [...(byRoom.get(f.showroomId) ?? []), f]);
  let k = 0;
  for (const [showroomId, list] of byRoom) {
    const paid = k++ % 2 === 0;
    const [st] = await db
      .insert(statements)
      .values({
        number: `GD-${lastMonth.replace("-", "")}-${String(showroomId).padStart(4, "0")}`,
        showroomId,
        month: lastMonth,
        amount: list.reduce((a, f) => a + f.amount, 0),
        gst: list.reduce((a, f) => a + f.gst, 0),
        status: paid ? "paid" : "issued",
        issuedAt: new Date(now - int(5, 15) * DAY),
        paidAt: paid ? new Date(now - int(1, 4) * DAY) : null,
      })
      .returning();
    await db.update(fees).set({ statementId: st.id, ...(paid ? { status: "paid" } : {}) }).where(inArray(fees.id, list.map((f) => f.id)));
  }

  await ensureDemoShowroomUsers({ createGroupIfNeeded: true });

  // A pending application, so the admin has one to verify.
  const [pune] = await db.select().from(schema.cities).where(eq(schema.cities.slug, "pune"));
  const [kia] = await db.select().from(schema.brands).where(eq(schema.brands.slug, "kia"));
  if (pune && kia) {
    const hash = await bcrypt.hash("demo1234", 10);
    const [u] = await db
      .insert(users)
      .values({ name: "Farhan Qureshi", email: "pending@groupdeal.demo", phone: "9000000005", passwordHash: hash, role: "showroom", cityId: pune.id, locality: "Hadapsar", createdAt: new Date(now - DAY) })
      .returning();
    const [room] = await db
      .insert(showrooms)
      .values({ name: "Mula Riverside Kia", brandId: kia.id, cityId: pune.id, locality: "Hadapsar", phone: "9000000005", rating: 0, address: "Solapur Road, Hadapsar, Pune 411028", status: "pending", createdAt: new Date(now - DAY) })
      .returning();
    await db.insert(showroomStaff).values({ showroomId: room.id, userId: u.id, role: "owner" });
  }
}

/**
 * Adds two demo logins (owner and sales executive) to the showroom with the most
 * going on, preferring one that also has an open invitation. Skips if they exist.
 */
export async function ensureDemoShowroomUsers(opts: { createGroupIfNeeded?: boolean } = {}) {
  const db = await getDb();
  const [have] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_SHOWROOM_EMAIL));
  if (have) return { added: false };
  const now = Date.now();

  const rooms = await db.select().from(showrooms).where(eq(showrooms.status, "approved")).orderBy(asc(showrooms.id));
  if (rooms.length === 0) return { added: false };
  const refCounts = await db.select({ id: referrals.showroomId, n: sql<number>`count(*)::int` }).from(referrals).groupBy(referrals.showroomId);
  const openInv = await db
    .select({ id: invitations.showroomId })
    .from(invitations)
    .innerJoin(groups, eq(invitations.groupId, groups.id))
    .where(and(eq(groups.status, "negotiating"), inArray(invitations.status, ["invited", "accepted"])));
  // Pune first (the launch city), then the most buyers, then a group waiting for its quote.
  const [pune] = await db.select({ id: schema.cities.id }).from(schema.cities).where(eq(schema.cities.slug, "pune"));
  const score = (id: number) =>
    (rooms.find((r) => r.id === id)?.cityId === pune?.id ? 10000 : 0) +
    (refCounts.find((x) => x.id === id)?.n ?? 0) * 10 +
    (openInv.some((x) => x.id === id) ? 1 : 0);
  const room = [...rooms].sort((a, b) => score(b.id) - score(a.id) || a.id - b.id)[0];

  // Fresh demo data: make sure this showroom also has a group waiting for its quote.
  if (opts.createGroupIfNeeded && !openInv.some((x) => x.id === room.id)) {
    const [model] = await db.select().from(models).where(eq(models.brandId, room.brandId)).orderBy(asc(models.id)).limit(1);
    const cityBuyers = await db.select({ id: users.id }).from(users).where(and(eq(users.cityId, room.cityId), eq(users.role, "buyer"))).limit(9);
    if (model && cityBuyers.length >= 3) {
      const [g] = await db
        .insert(groups)
        .values({ modelId: model.id, cityId: room.cityId, creatorId: cityBuyers[0].id, fuel: splitList(model.fuels)[0], transmission: "Any", targetSize: cityBuyers.length, deadline: new Date(now - DAY), status: "negotiating", createdAt: new Date(now - 18 * DAY) })
        .returning();
      const variants = splitList(model.variants);
      const colours = splitList(model.colours);
      await db.insert(memberships).values(
        cityBuyers.map((u, i) => ({ groupId: g.id, userId: u.id, stage: i % 3 === 0 ? "interested" : "verified", variant: variants[i % variants.length], colour: colours[i % 3], purchaseMonth: "", joinedAt: new Date(now - (17 - i) * DAY) })),
      );
      for (const r of rooms.filter((x) => x.cityId === room.cityId && x.brandId === room.brandId)) {
        await db.insert(invitations).values({ groupId: g.id, showroomId: r.id, deadline: new Date(now + 3 * DAY), invitedAt: new Date(now - DAY) }).onConflictDoNothing();
      }
    }
  }

  const hash = await bcrypt.hash("demo1234", 10);
  const [owner] = await db
    .insert(users)
    .values({ name: "Vikram Bhosale", email: DEMO_SHOWROOM_EMAIL, phone: "9000000003", passwordHash: hash, role: "showroom", cityId: room.cityId, locality: room.locality })
    .returning();
  const [sales] = await db
    .insert(users)
    .values({ name: "Sneha Pawar", email: DEMO_SALES_EMAIL, phone: "9000000004", passwordHash: hash, role: "showroom", cityId: room.cityId, locality: room.locality })
    .returning();
  await db.insert(showroomStaff).values([
    { showroomId: room.id, userId: owner.id, role: "owner" },
    { showroomId: room.id, userId: sales.id, role: "executive" },
  ]);

  // Give the executive the buyers already in progress, and leave one new buyer to acknowledge.
  const refs = await db.select().from(referrals).where(eq(referrals.showroomId, room.id)).orderBy(asc(referrals.id));
  const active = refs.filter((r) => ["acknowledged", "contacted", "test_drive"].includes(r.status));
  if (active.length) await db.update(referrals).set({ assignedTo: sales.id }).where(inArray(referrals.id, active.slice(0, 2).map((r) => r.id)));
  if (opts.createGroupIfNeeded && !refs.some((r) => r.status === "sent")) {
    const r = refs.find((x) => ["acknowledged", "contacted"].includes(x.status));
    if (r) {
      await db.update(referrals).set({ status: "sent", acknowledgedAt: null, assignedTo: null }).where(eq(referrals.id, r.id));
      await db.delete(referralEvents).where(and(eq(referralEvents.referralId, r.id), sql`${referralEvents.kind} <> 'created'`));
    }
  }
  // And one booking a buyer reported, for the showroom to confirm.
  if (opts.createGroupIfNeeded) {
    const r = (await db.select().from(referrals).where(eq(referrals.showroomId, room.id))).find((x) => ["contacted", "test_drive"].includes(x.status));
    if (r) {
      await db.update(referrals).set({ buyerReportedAt: new Date(now - 2 * DAY), buyerBookingNo: `BK${int(100000, 999999)}` }).where(eq(referrals.id, r.id));
      await db.insert(disputes).values({ referralId: r.id, respondBy: new Date(now + 5 * DAY), createdAt: new Date(now - 2 * DAY) });
      await db.insert(referralEvents).values({ referralId: r.id, kind: "buyer_reported", note: "Buyer reported a booking", at: new Date(now - 2 * DAY) });
    }
    await db.insert(notifications).values([
      { userId: owner.id, title: "Welcome to GroupDeal", body: "Groups waiting for your quote and buyers who picked you appear on Home.", href: "/showroom", createdAt: new Date(now - 3 * DAY) },
      { userId: owner.id, title: "Quote request from a group", body: "Send your best price before the deadline.", href: "/showroom/invitations", createdAt: new Date(now - DAY) },
    ]);
  }
  return { added: true, showroom: room.name };
}
