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
	CONSTRAINT "kitchen_period_demands_team_id_product_id_period_unique" UNIQUE("team_id","product_id","period")
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
	"recorded_at" timestamp DEFAULT now() NOT NULL
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
	CONSTRAINT "quotations_period_supplier_id_team_id_unique" UNIQUE("period","supplier_id","team_id")
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
	CONSTRAINT "quote_items_quotation_id_product_id_unique" UNIQUE("quotation_id","product_id")
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
ALTER TABLE "teams" ADD COLUMN "kitchen_code" varchar(50);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "region" varchar(50);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "manager_name" varchar(100);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "team_type" varchar(20) DEFAULT 'OFFICE' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "employee_code" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "kitchen_period_demands" ADD CONSTRAINT "kitchen_period_demands_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_period_demands" ADD CONSTRAINT "kitchen_period_demands_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_period_demands" ADD CONSTRAINT "kitchen_period_demands_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_kitchen_code_unique" UNIQUE("kitchen_code");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_employee_code_unique" UNIQUE("employee_code");