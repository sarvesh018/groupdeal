import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
  index,
  real,
} from "drizzle-orm/pg-core";

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  state: text("state").notNull(),
});

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const models = pgTable(
  "models",
  {
    id: serial("id").primaryKey(),
    brandId: integer("brand_id").notNull().references(() => brands.id),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    bodyType: text("body_type").notNull(), // hatchback | sedan | suv | mpv
    fuels: text("fuels").notNull(), // comma separated
    priceMin: integer("price_min").notNull(), // ex-showroom, rupees (dummy)
    priceMax: integer("price_max").notNull(),
  },
  (t) => [index("models_brand_idx").on(t.brandId)],
);

export const showrooms = pgTable(
  "showrooms",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    brandId: integer("brand_id").notNull().references(() => brands.id),
    cityId: integer("city_id").notNull().references(() => cities.id),
    locality: text("locality").notNull(),
    phone: text("phone").notNull(),
    rating: real("rating").notNull(),
  },
  (t) => [index("showrooms_city_brand_idx").on(t.cityId, t.brandId)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("buyer"), // buyer | admin
  cityId: integer("city_id").notNull().references(() => cities.id),
  locality: text("locality").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groups = pgTable(
  "groups",
  {
    id: serial("id").primaryKey(),
    modelId: integer("model_id").notNull().references(() => models.id),
    cityId: integer("city_id").notNull().references(() => cities.id),
    creatorId: integer("creator_id").notNull().references(() => users.id),
    variant: text("variant").notNull().default(""),
    fuel: text("fuel").notNull(),
    transmission: text("transmission").notNull(), // Manual | Automatic | Any
    description: text("description").notNull().default(""),
    targetSize: integer("target_size").notNull(),
    deadline: timestamp("deadline", { withTimezone: true }).notNull(),
    // forming | ready | negotiating | offers | completed | expired
    status: text("status").notNull().default("forming"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("groups_city_idx").on(t.cityId),
    index("groups_model_idx").on(t.modelId),
    index("groups_status_idx").on(t.status),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // interested | verified | accepted | booked | delivered
    stage: text("stage").notNull().default("interested"),
    purchaseMonth: text("purchase_month").notNull().default(""),
    note: text("note").notNull().default(""),
    acceptedQuoteId: integer("accepted_quote_id"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One membership per person per group: the database refuses duplicates.
    uniqueIndex("memberships_group_user_uq").on(t.groupId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

export const quotes = pgTable(
  "quotes",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    showroomId: integer("showroom_id").notNull().references(() => showrooms.id),
    exShowroom: integer("ex_showroom").notNull(),
    makerOffer: integer("maker_offer").notNull().default(0),
    dealerDiscount: integer("dealer_discount").notNull().default(0),
    insurance: integer("insurance").notNull(),
    rto: integer("rto").notNull(),
    accessories: integer("accessories").notNull().default(0),
    otherCharges: integer("other_charges").notNull().default(0),
    onRoad: integer("on_road").notNull(),
    deliveryWeeks: integer("delivery_weeks").notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quotes_group_idx").on(t.groupId)],
);
