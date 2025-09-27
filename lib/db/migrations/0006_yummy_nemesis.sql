CREATE INDEX "idx_quotations_period" ON "quotations" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_quotations_supplier_team" ON "quotations" USING btree ("supplier_id","team_id");--> statement-breakpoint
CREATE INDEX "idx_quotations_status_period" ON "quotations" USING btree ("status","period");--> statement-breakpoint
CREATE INDEX "idx_quotations_team_status" ON "quotations" USING btree ("team_id","status");