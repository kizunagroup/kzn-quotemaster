ALTER TABLE "suppliers" ALTER COLUMN "supplier_code" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "supplier_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "contact_person" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_suppliers_supplier_code" ON "suppliers" USING btree ("supplier_code");--> statement-breakpoint
CREATE INDEX "idx_suppliers_name" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_suppliers_status" ON "suppliers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_suppliers_deleted_at" ON "suppliers" USING btree ("deleted_at");