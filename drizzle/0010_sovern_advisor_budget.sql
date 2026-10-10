CREATE TABLE `sovern_advisor_budget` (
	`id` text PRIMARY KEY NOT NULL,
	`limit_nanomyr` integer NOT NULL,
	`booked_nanomyr` integer NOT NULL,
	`request_count` integer NOT NULL,
	`blocked` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "sovern_advisor_budget_id" CHECK("sovern_advisor_budget"."id" = 'dormathon-sovern-demo-v1'),
	CONSTRAINT "sovern_advisor_limit" CHECK("sovern_advisor_budget"."limit_nanomyr" = 5000000000),
	CONSTRAINT "sovern_advisor_booked" CHECK("sovern_advisor_budget"."booked_nanomyr" >= 3006050 AND "sovern_advisor_budget"."booked_nanomyr" <= "sovern_advisor_budget"."limit_nanomyr"),
	CONSTRAINT "sovern_advisor_count" CHECK("sovern_advisor_budget"."request_count" BETWEEN 0 AND 9),
	CONSTRAINT "sovern_advisor_blocked" CHECK("sovern_advisor_budget"."blocked" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `sovern_advisor_requests` (
	`request_key` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`case_id` text NOT NULL,
	`created_ms` integer NOT NULL,
	`attempt_token` text NOT NULL,
	`reservation_nanomyr` integer NOT NULL,
	`booked_nanomyr` integer NOT NULL,
	`observed_cost_nanomyr` integer,
	`state` text NOT NULL,
	`result_json` text,
	CONSTRAINT "sovern_advisor_reservation" CHECK("sovern_advisor_requests"."reservation_nanomyr" = 500000000),
	CONSTRAINT "sovern_advisor_request_booked" CHECK("sovern_advisor_requests"."booked_nanomyr" BETWEEN 0 AND "sovern_advisor_requests"."reservation_nanomyr"),
	CONSTRAINT "sovern_advisor_state" CHECK("sovern_advisor_requests"."state" IN ('reserved','complete','failed','unknown','billing_overrun')),
	CONSTRAINT "sovern_advisor_usage_hold" CHECK(("sovern_advisor_requests"."state" IN ('reserved','unknown','billing_overrun') AND "sovern_advisor_requests"."booked_nanomyr" = "sovern_advisor_requests"."reservation_nanomyr") OR ("sovern_advisor_requests"."state" IN ('complete','failed') AND "sovern_advisor_requests"."observed_cost_nanomyr" IS NOT NULL AND "sovern_advisor_requests"."observed_cost_nanomyr" = "sovern_advisor_requests"."booked_nanomyr")),
	CONSTRAINT "sovern_advisor_result" CHECK(("sovern_advisor_requests"."state" = 'reserved' AND "sovern_advisor_requests"."result_json" IS NULL) OR ("sovern_advisor_requests"."state" <> 'reserved' AND "sovern_advisor_requests"."result_json" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sovern_advisor_requests_fingerprint_unique` ON `sovern_advisor_requests` (`fingerprint`);--> statement-breakpoint
CREATE UNIQUE INDEX `sovern_advisor_requests_attempt_token_unique` ON `sovern_advisor_requests` (`attempt_token`);--> statement-breakpoint
CREATE INDEX `sovern_advisor_created_idx` ON `sovern_advisor_requests` (`created_ms`);