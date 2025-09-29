CREATE TABLE "supplier_service_scopes" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_service_scopes_supplier_id_team_id_unique" UNIQUE("supplier_id","team_id")
);
--> statement-breakpoint
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_period_supplier_id_team_id_unique";--> statement-breakpoint
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_team_id_teams_id_fk";
--> statement-breakpoint
DROP INDEX "idx_quotations_supplier_team";--> statement-breakpoint
DROP INDEX "idx_quotations_team_status";--> statement-breakpoint
ALTER TABLE "supplier_service_scopes" ADD CONSTRAINT "supplier_service_scopes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supplier_service_scopes" ADD CONSTRAINT "supplier_service_scopes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_supplier_service_scopes_supplier" ON "supplier_service_scopes" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_service_scopes_team" ON "supplier_service_scopes" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_service_scopes_active" ON "supplier_service_scopes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_quotations_supplier_region" ON "quotations" USING btree ("supplier_id","region");--> statement-breakpoint
CREATE INDEX "idx_quotations_region_status" ON "quotations" USING btree ("region","status");--> statement-breakpoint
ALTER TABLE "quotations" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_supplier_id_period_region_unique" UNIQUE("supplier_id","period","region");