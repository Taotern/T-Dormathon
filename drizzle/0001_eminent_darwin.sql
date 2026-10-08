CREATE TABLE `intel_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`upstream_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`category` text NOT NULL,
	`language` text,
	`published_at` text,
	`event_time` text,
	`first_seen_at` text NOT NULL,
	`fetched_at` text NOT NULL,
	`ingested_at` text NOT NULL,
	`current_version_id` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `intel_registry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intel_item_source_upstream_idx` ON `intel_items` (`source_id`,`upstream_id`);--> statement-breakpoint
CREATE INDEX `intel_item_time_idx` ON `intel_items` (`first_seen_at`);--> statement-breakpoint
CREATE INDEX `intel_item_category_idx` ON `intel_items` (`category`);--> statement-breakpoint
CREATE TABLE `intel_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`enabled` integer NOT NULL,
	`version` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `intel_rule_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`version_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`created_at` text NOT NULL,
	`evidence_snapshot` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `intel_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`version_id`) REFERENCES `intel_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intel_alert_created_idx` ON `intel_rule_alerts` (`created_at`);--> statement-breakpoint
CREATE TABLE `intel_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`status` text NOT NULL,
	`attempted_at` text NOT NULL,
	`completed_at` text,
	`receipt` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `intel_registry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intel_run_source_time_idx` ON `intel_runs` (`source_id`,`attempted_at`);--> statement-breakpoint
CREATE TABLE `intel_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`run_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`observed_at` text NOT NULL,
	`metadata` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `intel_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `intel_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `intel_version_item_idx` ON `intel_versions` (`item_id`);