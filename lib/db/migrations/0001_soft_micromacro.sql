ALTER TABLE "users" ADD COLUMN "job_title" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "department" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hire_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_users_employee_code" ON "users" USING btree ("employee_code") WHERE "users"."employee_code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_users_department" ON "users" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "users" USING btree ("status");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "employee_code_format" CHECK ("users"."employee_code" ~ '^[A-Z0-9_-]+$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "status_values" CHECK ("users"."status" IN ('active', 'inactive', 'terminated'));