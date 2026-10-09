CREATE TABLE `outcome_events` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_record_id` text NOT NULL,
	`event_group_id` text NOT NULL,
	`domain` text NOT NULL,
	`title` text NOT NULL,
	`current_version_id` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `outcome_registry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outcome_source_identity_idx` ON `outcome_events` (`source_id`,`source_record_id`);--> statement-breakpoint
CREATE INDEX `outcome_group_idx` ON `outcome_events` (`event_group_id`);--> statement-breakpoint
CREATE TABLE `outcome_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`version_id` text NOT NULL,
	`metric_id` text NOT NULL,
	`value_type` text NOT NULL,
	`numeric_value` real,
	`categorical_value` text,
	`value_status` text NOT NULL,
	`unit` text NOT NULL,
	`label_kind` text NOT NULL,
	`metadata` text NOT NULL,
	FOREIGN KEY (`version_id`) REFERENCES `outcome_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `outcome_metric_version_idx` ON `outcome_metrics` (`version_id`);--> statement-breakpoint
CREATE TABLE `outcome_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outcome_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`manifest_sha256` text NOT NULL,
	`policy_sha256` text NOT NULL,
	`chunk_sha256` text NOT NULL,
	`imported_at` text NOT NULL,
	`receipt` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `outcome_registry`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outcome_run_chunk_idx` ON `outcome_runs` (`manifest_sha256`,`chunk_sha256`);--> statement-breakpoint
CREATE TABLE `outcome_versions` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`event_id` text NOT NULL,
	`run_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`metadata_sha256` text NOT NULL,
	`policy_sha256` text NOT NULL,
	`acquired_at` text NOT NULL,
	`imported_at` text NOT NULL,
	`onset_day` text,
	`onset_lower_day` text,
	`onset_upper_day` text,
	`end_day` text,
	`metadata` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `outcome_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `outcome_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outcome_version_identity_idx` ON `outcome_versions` (`id`);--> statement-breakpoint
CREATE INDEX `outcome_version_event_idx` ON `outcome_versions` (`event_id`,`sequence`);