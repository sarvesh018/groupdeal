CREATE TABLE "booking_proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"referral_id" integer NOT NULL,
	"uploaded_by" integer,
	"file_name" text NOT NULL,
	"data_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"referral_id" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"showroom_response" text DEFAULT '' NOT NULL,
	"respond_by" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"resolution_note" text DEFAULT '' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_bands" (
	"id" serial PRIMARY KEY NOT NULL,
	"min_price" integer NOT NULL,
	"max_price" integer,
	"fee" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fees" (
	"id" serial PRIMARY KEY NOT NULL,
	"referral_id" integer NOT NULL,
	"showroom_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"gst" integer NOT NULL,
	"status" text DEFAULT 'due' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"statement_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"showroom_id" integer NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"href" text DEFAULT '' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_colours" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"colour" text NOT NULL,
	"delivery_weeks" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"variant" text NOT NULL,
	"ex_showroom" integer NOT NULL,
	"maker_offer" integer DEFAULT 0 NOT NULL,
	"dealer_discount" integer DEFAULT 0 NOT NULL,
	"insurance" integer NOT NULL,
	"rto" integer NOT NULL,
	"accessories" integer DEFAULT 0 NOT NULL,
	"other_charges" integer DEFAULT 0 NOT NULL,
	"on_road" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"referral_id" integer NOT NULL,
	"actor_id" integer,
	"kind" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"membership_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"showroom_id" integer NOT NULL,
	"quote_id" integer,
	"status" text DEFAULT 'sent' NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"assigned_to" integer,
	"booking_no" text DEFAULT '' NOT NULL,
	"booked_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"lost_reason" text DEFAULT '' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"buyer_reported_at" timestamp with time zone,
	"buyer_booking_no" text DEFAULT '' NOT NULL,
	CONSTRAINT "referrals_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "showroom_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"showroom_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"data_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showroom_staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"showroom_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statements" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"showroom_id" integer NOT NULL,
	"month" text NOT NULL,
	"amount" integer NOT NULL,
	"gst" integer NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "statements_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "variant" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "colour" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "alt_colours" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "transmission" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "features" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "flexible_trim" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "variants" text DEFAULT 'Base,Mid,Top' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "colours" text DEFAULT 'White,Grey,Black,Silver,Red,Blue' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "status" text DEFAULT 'submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "showrooms" ADD COLUMN "address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "showrooms" ADD COLUMN "gst_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "showrooms" ADD COLUMN "dealer_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "showrooms" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "showrooms" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "showrooms" ADD COLUMN "free_bookings" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "showrooms" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_proofs" ADD CONSTRAINT "booking_proofs_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_proofs" ADD CONSTRAINT "booking_proofs_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_showroom_id_showrooms_id_fk" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fees" ADD CONSTRAINT "fees_statement_id_statements_id_fk" FOREIGN KEY ("statement_id") REFERENCES "public"."statements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_showroom_id_showrooms_id_fk" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_colours" ADD CONSTRAINT "quote_colours_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_showroom_id_showrooms_id_fk" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showroom_documents" ADD CONSTRAINT "showroom_documents_showroom_id_showrooms_id_fk" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showroom_staff" ADD CONSTRAINT "showroom_staff_showroom_id_showrooms_id_fk" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showroom_staff" ADD CONSTRAINT "showroom_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statements" ADD CONSTRAINT "statements_showroom_id_showrooms_id_fk" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fees_referral_uq" ON "fees" USING btree ("referral_id");--> statement-breakpoint
CREATE INDEX "fees_showroom_idx" ON "fees" USING btree ("showroom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_group_showroom_uq" ON "invitations" USING btree ("group_id","showroom_id");--> statement-breakpoint
CREATE INDEX "invitations_showroom_idx" ON "invitations" USING btree ("showroom_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_colours_quote_colour_uq" ON "quote_colours" USING btree ("quote_id","colour");--> statement-breakpoint
CREATE UNIQUE INDEX "quote_lines_quote_variant_uq" ON "quote_lines" USING btree ("quote_id","variant");--> statement-breakpoint
CREATE INDEX "referral_events_referral_idx" ON "referral_events" USING btree ("referral_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_membership_showroom_uq" ON "referrals" USING btree ("membership_id","showroom_id");--> statement-breakpoint
CREATE INDEX "referrals_showroom_idx" ON "referrals" USING btree ("showroom_id");--> statement-breakpoint
CREATE INDEX "referrals_status_idx" ON "referrals" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "showroom_staff_user_uq" ON "showroom_staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "showroom_staff_showroom_idx" ON "showroom_staff" USING btree ("showroom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "statements_showroom_month_uq" ON "statements" USING btree ("showroom_id","month");--> statement-breakpoint
-- Keep only the newest quote per showroom per group, so the new one-quote rule can apply.
UPDATE "memberships" m SET "accepted_quote_id" = keep.id
FROM "quotes" q
JOIN LATERAL (
  SELECT q2.id FROM "quotes" q2 WHERE q2.group_id = q.group_id AND q2.showroom_id = q.showroom_id ORDER BY q2.created_at DESC, q2.id DESC LIMIT 1
) keep ON true
WHERE m.accepted_quote_id = q.id AND keep.id <> q.id;--> statement-breakpoint
DELETE FROM "quotes" q USING "quotes" newer
WHERE newer.group_id = q.group_id AND newer.showroom_id = q.showroom_id
  AND (newer.created_at > q.created_at OR (newer.created_at = q.created_at AND newer.id > q.id));--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_group_showroom_uq" ON "quotes" USING btree ("group_id","showroom_id");--> statement-breakpoint
-- Showrooms that existed before the portal are treated as verified.
UPDATE "showrooms" SET "status" = 'approved', "verified_at" = now();--> statement-breakpoint
UPDATE "quotes" SET "submitted_at" = "created_at" WHERE "submitted_at" IS NULL;--> statement-breakpoint
-- Each existing quote becomes a one-line rate card.
INSERT INTO "quote_lines" ("quote_id","variant","ex_showroom","maker_offer","dealer_discount","insurance","rto","accessories","other_charges","on_road")
SELECT "id",'All variants',"ex_showroom","maker_offer","dealer_discount","insurance","rto","accessories","other_charges","on_road" FROM "quotes";--> statement-breakpoint
-- Showrooms that already quoted count as invited and quoted.
INSERT INTO "invitations" ("group_id","showroom_id","status","deadline","invited_at","responded_at")
SELECT "group_id","showroom_id",'quoted',"created_at","created_at","created_at" FROM "quotes"
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Members who already picked an offer get a referral, so the referral list starts complete.
INSERT INTO "referrals" ("code","membership_id","group_id","showroom_id","quote_id","status","consent_at","sent_at","expires_at","booked_at","delivered_at")
SELECT 'GD-' || lpad(m.group_id::text, 3, '0') || '-' || lpad(m.id::text, 4, '0'),
       m.id, m.group_id, q.showroom_id, q.id,
       CASE m.stage WHEN 'booked' THEN 'booked' WHEN 'delivered' THEN 'delivered' ELSE 'sent' END,
       now(), now(), now() + interval '90 days',
       CASE WHEN m.stage IN ('booked','delivered') THEN now() END,
       CASE WHEN m.stage = 'delivered' THEN now() END
FROM "memberships" m JOIN "quotes" q ON q.id = m.accepted_quote_id
WHERE m.stage IN ('accepted','booked','delivered')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "referral_events" ("referral_id","kind","note")
SELECT "id",'created','Created when the showroom portal was added' FROM "referrals";--> statement-breakpoint
-- Starting fee per confirmed booking, by ex-showroom price. Change them in Admin > Billing.
INSERT INTO "fee_bands" ("min_price","max_price","fee") VALUES
  (0, 1000000, 2500),
  (1000000, 2000000, 4000),
  (2000000, 4000000, 9000),
  (4000000, NULL, 18000);