CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_id` text,
	`title` text NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`evidence_snapshot` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`alert_id`) REFERENCES `alerts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`rule_id` text NOT NULL,
	`title` text NOT NULL,
	`severity` text NOT NULL,
	`detail` text NOT NULL,
	`evidence_ids` text DEFAULT '[]' NOT NULL,
	`recommended_action` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data_kind` text DEFAULT 'operational' NOT NULL,
	`evidence_kind` text DEFAULT 'record' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `alert_domain_active_idx` ON `alerts` (`domain`,`active`);--> statement-breakpoint
CREATE TABLE `chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`source_id` text NOT NULL,
	`text` text NOT NULL,
	`domain_tags` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `chunk_source_idx` ON `chunks` (`source_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`domain_tags` text DEFAULT '[]' NOT NULL,
	`record_id` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `document_record_idx` ON `documents` (`record_id`);--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`occurred_at` text NOT NULL,
	`source_id` text NOT NULL,
	`payload` text NOT NULL,
	`fingerprint` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `record_domain_idx` ON `records` (`domain`);--> statement-breakpoint
CREATE UNIQUE INDEX `record_fingerprint_idx` ON `records` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`url` text DEFAULT '',
	`publisher` text DEFAULT '',
	`retrieved_at` text,
	`kind` text NOT NULL,
	`license` text DEFAULT '',
	`domain_tags` text DEFAULT '[]' NOT NULL,
	`sha256` text DEFAULT '',
	`availability` text DEFAULT 'available',
	`metadata` text DEFAULT '{}' NOT NULL
);
