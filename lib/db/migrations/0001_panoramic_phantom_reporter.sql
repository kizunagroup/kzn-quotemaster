ALTER TABLE "teams" RENAME COLUMN "kitchen_code" TO "team_code";--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_kitchen_code_unique";--> statement-breakpoint
DROP INDEX "idx_teams_kitchen_code";--> statement-breakpoint
CREATE INDEX "idx_teams_team_code" ON "teams" USING btree ("team_code") WHERE "teams"."team_code" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_team_code_unique" UNIQUE("team_code");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "team_code_business_rule" CHECK (("teams"."team_type" = 'KITCHEN' AND "teams"."team_code" IS NOT NULL) OR ("teams"."team_type" = 'OFFICE'));