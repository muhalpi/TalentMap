CREATE TABLE "test_rate_limit_buckets" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"ip_hash" text NOT NULL,
	"route_scope" text NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"window_ends_at" timestamp with time zone NOT NULL,
	"blocked_until" timestamp with time zone,
	"last_request_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_rate_limit_buckets_request_count_positive" CHECK ("test_rate_limit_buckets"."request_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX "test_rate_limit_buckets_token_idx" ON "test_rate_limit_buckets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "test_rate_limit_buckets_ip_idx" ON "test_rate_limit_buckets" USING btree ("ip_hash");--> statement-breakpoint
CREATE INDEX "test_rate_limit_buckets_window_ends_idx" ON "test_rate_limit_buckets" USING btree ("window_ends_at");