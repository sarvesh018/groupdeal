CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"state" text NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"city_id" integer NOT NULL,
	"creator_id" integer NOT NULL,
	"variant" text DEFAULT '' NOT NULL,
	"fuel" text NOT NULL,
	"transmission" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"target_size" integer NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'forming' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"stage" text DEFAULT 'interested' NOT NULL,
	"purchase_month" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"accepted_quote_id" integer,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"body_type" text NOT NULL,
	"fuels" text NOT NULL,
	"price_min" integer NOT NULL,
	"price_max" integer NOT NULL,
	CONSTRAINT "models_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"showroom_id" integer NOT NULL,
	"ex_showroom" integer NOT NULL,
	"maker_offer" integer DEFAULT 0 NOT NULL,
	"dealer_discount" integer DEFAULT 0 NOT NULL,
	"insurance" integer NOT NULL,
	"rto" integer NOT NULL,
	"accessories" integer DEFAULT 0 NOT NULL,
	"other_charges" integer DEFAULT 0 NOT NULL,
	"on_road" integer NOT NULL,
	"delivery_weeks" integer NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showrooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand_id" integer NOT NULL,
	"city_id" integer NOT NULL,
	"locality" text NOT NULL,
	"phone" text NOT NULL,
	"rating" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'buyer' NOT NULL,
	"city_id" integer NOT NULL,
	"locality" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_showroom_id_showrooms_id_fk" FOREIGN KEY ("showroom_id") REFERENCES "public"."showrooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showrooms" ADD CONSTRAINT "showrooms_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showrooms" ADD CONSTRAINT "showrooms_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "groups_city_idx" ON "groups" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "groups_model_idx" ON "groups" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "groups_status_idx" ON "groups" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_group_user_uq" ON "memberships" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "models_brand_idx" ON "models" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "quotes_group_idx" ON "quotes" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "showrooms_city_brand_idx" ON "showrooms" USING btree ("city_id","brand_id");