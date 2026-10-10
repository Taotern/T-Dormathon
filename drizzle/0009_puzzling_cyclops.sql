CREATE TABLE `journey_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`project_id` text,
	`case_id` text,
	`parent_id` text,
	`payload_hash` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `workspace_projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `journey_kind_created_idx` ON `journey_entries` (`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `journey_project_created_idx` ON `journey_entries` (`project_id`,`created_at`);