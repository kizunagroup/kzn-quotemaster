ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_products_product_code" ON "products" USING btree ("product_code");--> statement-breakpoint
CREATE INDEX "idx_products_name" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_products_status" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_products_category_status" ON "products" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "idx_products_deleted_at" ON "products" USING btree ("deleted_at");