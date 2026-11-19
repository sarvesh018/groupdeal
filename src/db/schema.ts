import {
  boolean,
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
    // Comma-separated lists that buyers pick from and showrooms quote against.
    variants: text("variants").notNull().default("Base,Mid,Top"),
    colours: text("colours").notNull().default("White,Grey,Black,Silver,Red,Blue"),
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
    address: text("address").notNull().default(""),
    gstNumber: text("gst_number").notNull().default(""),
    dealerCode: text("dealer_code").notNull().default(""),
    // pending | approved | suspended. Only approved showrooms can be invited or quote.
    status: text("status").notNull().default("pending"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    // Bookings at the start of the partnership that carry no fee.
    freeBookings: integer("free_bookings").notNull().default(3),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("showrooms_city_brand_idx").on(t.cityId, t.brandId)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("buyer"), // buyer | admin | showroom
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
    // The member's own choices within the group's car.
    variant: text("variant").notNull().default(""),
    colour: text("colour").notNull().default(""),
    altColours: text("alt_colours").notNull().default(""), // comma-separated
    transmission: text("transmission").notNull().default(""),
    features: text("features").notNull().default(""), // comma-separated must-haves
    flexibleTrim: boolean("flexible_trim").notNull().default(false),
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
    // draft | submitted. Buyers only ever see submitted quotes.
    status: text("status").notNull().default("submitted"),
    note: text("note").notNull().default(""),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("quotes_group_idx").on(t.groupId),
    // One quote per showroom per group; revisions update it.
    uniqueIndex("quotes_group_showroom_uq").on(t.groupId, t.showroomId),
  ],
);

/* ------------------------------------------------------------------
   Phase 1: showroom portal
------------------------------------------------------------------- */

export const showroomStaff = pgTable(
  "showroom_staff",
  {
    id: serial("id").primaryKey(),
    showroomId: integer("showroom_id").notNull().references(() => showrooms.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // owner | manager | executive
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("showroom_staff_user_uq").on(t.userId), index("showroom_staff_showroom_idx").on(t.showroomId)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    showroomId: integer("showroom_id").notNull().references(() => showrooms.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("invited"), // invited | accepted | declined | quoted
    deadline: timestamp("deadline", { withTimezone: true }).notNull(),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("invitations_group_showroom_uq").on(t.groupId, t.showroomId), index("invitations_showroom_idx").on(t.showroomId)],
);

/** One row per variant in a showroom's rate card. */
export const quoteLines = pgTable(
  "quote_lines",
  {
    id: serial("id").primaryKey(),
    quoteId: integer("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
    variant: text("variant").notNull(),
    exShowroom: integer("ex_showroom").notNull(),
    makerOffer: integer("maker_offer").notNull().default(0),
    dealerDiscount: integer("dealer_discount").notNull().default(0),
    insurance: integer("insurance").notNull(),
    rto: integer("rto").notNull(),
    accessories: integer("accessories").notNull().default(0),
    otherCharges: integer("other_charges").notNull().default(0),
    onRoad: integer("on_road").notNull(),
  },
  (t) => [uniqueIndex("quote_lines_quote_variant_uq").on(t.quoteId, t.variant)],
);

/** Stock or delivery time per colour. 0 weeks = in stock. */
export const quoteColours = pgTable(
  "quote_colours",
  {
    id: serial("id").primaryKey(),
    quoteId: integer("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
    colour: text("colour").notNull(),
    deliveryWeeks: integer("delivery_weeks").notNull(),
  },
  (t) => [uniqueIndex("quote_colours_quote_colour_uq").on(t.quoteId, t.colour)],
);

/** A buyer sent to a showroom after picking its offer. */
export const referrals = pgTable(
  "referrals",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    membershipId: integer("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
    groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    showroomId: integer("showroom_id").notNull().references(() => showrooms.id),
    quoteId: integer("quote_id").references(() => quotes.id, { onDelete: "set null" }),
    // sent | acknowledged | contacted | test_drive | booked | delivered | lost | cancelled | expired
    status: text("status").notNull().default("sent"),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    assignedTo: integer("assigned_to").references(() => users.id, { onDelete: "set null" }),
    bookingNo: text("booking_no").notNull().default(""),
    bookedAt: timestamp("booked_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    lostReason: text("lost_reason").notNull().default(""),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    buyerReportedAt: timestamp("buyer_reported_at", { withTimezone: true }),
    buyerBookingNo: text("buyer_booking_no").notNull().default(""),
  },
  (t) => [
    // A member can be referred to each showroom once; switching back re-opens the same referral.
    uniqueIndex("referrals_membership_showroom_uq").on(t.membershipId, t.showroomId),
    index("referrals_showroom_idx").on(t.showroomId),
    index("referrals_status_idx").on(t.status),
  ],
);

/** Every step of a referral, timestamped. Settles fee disputes. */
export const referralEvents = pgTable(
  "referral_events",
  {
    id: serial("id").primaryKey(),
    referralId: integer("referral_id").notNull().references(() => referrals.id, { onDelete: "cascade" }),
    actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    note: text("note").notNull().default(""),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("referral_events_referral_idx").on(t.referralId)],
);

/** A booking receipt photo a buyer uploads. Stored as a data URL (max ~2 MB). */
export const bookingProofs = pgTable("booking_proofs", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").notNull().references(() => referrals.id, { onDelete: "cascade" }),
  uploadedBy: integer("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  fileName: text("file_name").notNull(),
  dataUrl: text("data_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Showroom verification documents. */
export const showroomDocuments = pgTable("showroom_documents", {
  id: serial("id").primaryKey(),
  showroomId: integer("showroom_id").notNull().references(() => showrooms.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  dataUrl: text("data_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Fee per confirmed booking, by the car's ex-showroom price. */
export const feeBands = pgTable("fee_bands", {
  id: serial("id").primaryKey(),
  minPrice: integer("min_price").notNull(),
  maxPrice: integer("max_price"), // null = no upper limit
  fee: integer("fee").notNull(),
});

export const statements = pgTable(
  "statements",
  {
    id: serial("id").primaryKey(),
    number: text("number").notNull().unique(),
    showroomId: integer("showroom_id").notNull().references(() => showrooms.id),
    month: text("month").notNull(), // YYYY-MM
    amount: integer("amount").notNull(),
    gst: integer("gst").notNull(),
    status: text("status").notNull().default("issued"), // issued | paid
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("statements_showroom_month_uq").on(t.showroomId, t.month)],
);

export const fees = pgTable(
  "fees",
  {
    id: serial("id").primaryKey(),
    referralId: integer("referral_id").notNull().references(() => referrals.id, { onDelete: "cascade" }),
    showroomId: integer("showroom_id").notNull().references(() => showrooms.id),
    amount: integer("amount").notNull(), // before GST
    gst: integer("gst").notNull(),
    status: text("status").notNull().default("due"), // due | waived | paid | cancelled
    note: text("note").notNull().default(""),
    statementId: integer("statement_id").references(() => statements.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("fees_referral_uq").on(t.referralId), index("fees_showroom_idx").on(t.showroomId)],
);

export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").notNull().references(() => referrals.id, { onDelete: "cascade" }),
  // open | confirmed (showroom agreed) | rejected (showroom disagreed) | fee_due | no_fee
  status: text("status").notNull().default("open"),
  showroomResponse: text("showroom_response").notNull().default(""),
  respondBy: timestamp("respond_by", { withTimezone: true }).notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  resolutionNote: text("resolution_note").notNull().default(""),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href").notNull().default(""),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);
