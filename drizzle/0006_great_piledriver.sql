ALTER TABLE "clients" DROP CONSTRAINT "clients_retention_days_non_negative";--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "retention_days";