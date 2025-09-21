CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"invited_by" integer NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_period_demands" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"period" varchar(10) NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"notes" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kitchen_period_demands_team_id_product_id_period_unique" UNIQUE("team_id","product_id","period"),
	CONSTRAINT "positive_quantity" CHECK ("kitchen_period_demands"."quantity" > 0),
	CONSTRAINT "period_format" CHECK ("kitchen_period_demands"."period" ~ '^\d{4}-\d{2}-\d{2}$'),
	CONSTRAINT "valid_status" CHECK ("kitchen_period_demands"."status" IN ('active', 'inactive'))
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"team_id" integer,
	"period" varchar(10) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"price_type" varchar(20) NOT NULL,
	"region" varchar(50),
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "non_negative_price" CHECK ("price_history"."price" >= 0),
	CONSTRAINT "period_format" CHECK ("price_history"."period" ~ '^\d{4}-\d{2}-\d{2}$'),
	CONSTRAINT "valid_price_type" CHECK ("price_history"."price_type" IN ('initial', 'negotiated', 'approved'))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"specification" text,
	"unit" varchar(50) NOT NULL,
	"category" varchar(100) NOT NULL,
	"base_price" numeric(12, 2),
	"base_quantity" numeric(10, 2),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_product_code_unique" UNIQUE("product_code")
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" varchar(100) NOT NULL,
	"period" varchar(10) NOT NULL,
	"supplier_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"region" varchar(50) NOT NULL,
	"category" varchar(100) NOT NULL,
	"quote_date" timestamp,
	"update_date" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_quotation_id_unique" UNIQUE("quotation_id"),
	CONSTRAINT "quotations_period_supplier_id_team_id_unique" UNIQUE("period","supplier_id","team_id"),
	CONSTRAINT "period_format" CHECK ("quotations"."period" ~ '^\d{4}-\d{2}-\d{2}$'),
	CONSTRAINT "valid_status" CHECK ("quotations"."status" IN ('pending', 'approved', 'cancelled', 'negotiation'))
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(12, 2),
	"initial_price" numeric(12, 2),
	"negotiated_price" numeric(12, 2),
	"approved_price" numeric(12, 2),
	"vat_percentage" numeric(5, 2) DEFAULT '0',
	"currency" varchar(3) DEFAULT 'VND',
	"price_per_unit" numeric(12, 2),
	"negotiation_rounds" integer DEFAULT 0,
	"last_negotiated_at" timestamp,
	"approved_at" timestamp,
	"approved_by" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quote_items_quotation_id_product_id_unique" UNIQUE("quotation_id","product_id"),
	CONSTRAINT "positive_quantity" CHECK ("quote_items"."quantity" > 0),
	CONSTRAINT "non_negative_prices" CHECK (
    "quote_items"."initial_price" >= 0 AND
    ("quote_items"."negotiated_price" >= 0 OR "quote_items"."negotiated_price" IS NULL) AND
    ("quote_items"."approved_price" >= 0 OR "quote_items"."approved_price" IS NULL)
  ),
	CONSTRAINT "valid_vat" CHECK ("quote_items"."vat_percentage" >= 0 AND "quote_items"."vat_percentage" <= 100)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"tax_id" varchar(50),
	"address" text,
	"contact_person" varchar(100),
	"phone" varchar(20),
	"email" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_supplier_code_unique" UNIQUE("supplier_code")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"role" varchar(50) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_product_id" text,
	"plan_name" varchar(50),
	"subscription_status" varchar(20),
	"kitchen_code" varchar(50),
	"region" varchar(50),
	"address" text,
	"manager_id" integer,
	"team_type" varchar(20) DEFAULT 'OFFICE' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	CONSTRAINT "teams_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "teams_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "teams_kitchen_code_unique" UNIQUE("kitchen_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"employee_code" varchar(50),
	"phone" varchar(20),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kitchen_period_demands" ADD CONSTRAINT "kitchen_period_demands_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kitchen_period_demands" ADD CONSTRAINT "kitchen_period_demands_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kitchen_period_demands" ADD CONSTRAINT "kitchen_period_demands_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_teams_kitchen_code" ON "teams" USING btree ("kitchen_code") WHERE "teams"."kitchen_code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_teams_team_type" ON "teams" USING btree ("team_type");--> statement-breakpoint
CREATE INDEX "idx_teams_region_status" ON "teams" USING btree ("region","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_teams_name_search" ON "teams" USING btree ("name") WHERE "teams"."team_type" = 'KITCHEN';--> statement-breakpoint
CREATE INDEX "idx_teams_manager_id" ON "teams" USING btree ("manager_id") WHERE "teams"."manager_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_teams_kitchen_composite" ON "teams" USING btree ("team_type","region","deleted_at","name");