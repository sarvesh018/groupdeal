import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { cities, brands, models, showrooms, users, groups, memberships, quotes } = schema;

export async function listCities() {
  const db = await getDb();
  return db.select().from(cities).orderBy(asc(cities.id));
}

export async function listCatalogue() {
  const db = await getDb();
  const b = await db.select().from(brands).orderBy(asc(brands.name));
  const m = await db.select().from(models).orderBy(asc(models.name));
  return b.map((brand) => ({ ...brand, models: m.filter((x) => x.brandId === brand.id) }));
}

const memberCount = sql<number>`(select count(*)::int from memberships m where m.group_id = ${groups.id})`;

const groupCardFields = {
  id: groups.id,
  status: groups.status,
  targetSize: groups.targetSize,
  deadline: groups.deadline,
  variant: groups.variant,
  fuel: groups.fuel,
  transmission: groups.transmission,
  createdAt: groups.createdAt,
  model: models.name,
  bodyType: models.bodyType,
  priceMin: models.priceMin,
  priceMax: models.priceMax,
  brand: brands.name,
  brandId: brands.id,
  city: cities.name,
  citySlug: cities.slug,
  cityId: cities.id,
  members: memberCount,
};

export type GroupCard = {
  id: number;
  status: string;
  targetSize: number;
  deadline: Date;
  variant: string;
  fuel: string;
  transmission: string;
  createdAt: Date;
  model: string;
  bodyType: string;
  priceMin: number;
  priceMax: number;
  brand: string;
  brandId: number;
  city: string;
  citySlug: string;
  cityId: number;
  members: number;
};

function groupCards() {
  return async (where?: ReturnType<typeof and>) => {
    const db = await getDb();
    return db
      .select(groupCardFields)
      .from(groups)
      .innerJoin(models, eq(groups.modelId, models.id))
      .innerJoin(brands, eq(models.brandId, brands.id))
      .innerJoin(cities, eq(groups.cityId, cities.id))
      .where(where)
      .orderBy(desc(groups.createdAt)) as Promise<GroupCard[]>;
  };
}

export async function listGroups(opts: { includeClosed?: boolean } = {}) {
  return groupCards()(opts.includeClosed ? undefined : and(ne(groups.status, "expired")));
}

export async function listGroupsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  return groupCards()(and(inArray(groups.id, ids)));
}

export async function getGroup(id: number) {
  const [card] = await groupCards()(and(eq(groups.id, id)));
  if (!card) return null;
  const db = await getDb();
  const [extra] = await db
    .select({ description: groups.description, creatorId: groups.creatorId, modelId: groups.modelId })
    .from(groups)
    .where(eq(groups.id, id));
  const memberRows = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      stage: memberships.stage,
      purchaseMonth: memberships.purchaseMonth,
      note: memberships.note,
      acceptedQuoteId: memberships.acceptedQuoteId,
      joinedAt: memberships.joinedAt,
      name: users.name,
      email: users.email,
      phone: users.phone,
      locality: users.locality,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.groupId, id))
    .orderBy(asc(memberships.joinedAt));
  const quoteRows = await db
    .select({
      id: quotes.id,
      exShowroom: quotes.exShowroom,
      makerOffer: quotes.makerOffer,
      dealerDiscount: quotes.dealerDiscount,
      insurance: quotes.insurance,
      rto: quotes.rto,
      accessories: quotes.accessories,
      otherCharges: quotes.otherCharges,
      onRoad: quotes.onRoad,
      deliveryWeeks: quotes.deliveryWeeks,
      validUntil: quotes.validUntil,
      showroomId: showrooms.id,
      showroom: showrooms.name,
      showroomLocality: showrooms.locality,
      showroomRating: showrooms.rating,
      showroomPhone: showrooms.phone,
    })
    .from(quotes)
    .innerJoin(showrooms, eq(quotes.showroomId, showrooms.id))
    .where(eq(quotes.groupId, id))
    .orderBy(asc(quotes.onRoad));
  const localShowrooms = await db
    .select()
    .from(showrooms)
    .where(and(eq(showrooms.cityId, card.cityId), eq(showrooms.brandId, card.brandId)))
    .orderBy(desc(showrooms.rating));
  return { ...card, ...extra, memberRows, quoteRows, localShowrooms };
}

export type GroupDetail = NonNullable<Awaited<ReturnType<typeof getGroup>>>;

/** An open group for the same car in the same city, if one exists. */
export async function findOpenGroup(modelId: number, cityId: number) {
  const db = await getDb();
  const [row] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.modelId, modelId), eq(groups.cityId, cityId), inArray(groups.status, ["forming", "ready"])))
    .limit(1);
  return row ?? null;
}

export async function listMyMemberships(userId: number) {
  const db = await getDb();
  return db
    .select({ id: memberships.id, groupId: memberships.groupId, stage: memberships.stage, acceptedQuoteId: memberships.acceptedQuoteId })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .orderBy(desc(memberships.joinedAt));
}

/* ---------------------------------------------------------------- admin */

export async function adminUsers() {
  const db = await getDb();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      locality: users.locality,
      createdAt: users.createdAt,
      city: cities.name,
      cityId: cities.id,
      groups: sql<number>`(select count(*)::int from memberships m where m.user_id = ${users.id})`,
    })
    .from(users)
    .innerJoin(cities, eq(users.cityId, cities.id))
    .orderBy(desc(users.createdAt));
}

export async function adminShowrooms() {
  const db = await getDb();
  return db
    .select({
      id: showrooms.id,
      name: showrooms.name,
      locality: showrooms.locality,
      phone: showrooms.phone,
      rating: showrooms.rating,
      brand: brands.name,
      city: cities.name,
      cityId: cities.id,
      quotes: sql<number>`(select count(*)::int from quotes q where q.showroom_id = ${showrooms.id})`,
    })
    .from(showrooms)
    .innerJoin(brands, eq(showrooms.brandId, brands.id))
    .innerJoin(cities, eq(showrooms.cityId, cities.id))
    .orderBy(asc(cities.id), asc(brands.name), asc(showrooms.name));
}
