CREATE TABLE `workspace_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`title` text NOT NULL,
	`owner` text DEFAULT '' NOT NULL,
	`due_at` text,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`evidence_snapshot` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `workspace_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_action_case_idx` ON `workspace_actions` (`case_id`);--> statement-breakpoint
CREATE TABLE `workspace_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`object_id` text,
	`title` text NOT NULL,
	`question` text NOT NULL,
	`domain` text NOT NULL,
	`priority` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `workspace_projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`object_id`) REFERENCES `workspace_objects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_case_project_idx` ON `workspace_cases` (`project_id`);--> statement-breakpoint
CREATE TABLE `workspace_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`version_id` text NOT NULL,
	`association_status` text NOT NULL,
	`association_note` text DEFAULT '' NOT NULL,
	`snapshot` text NOT NULL,
	`added_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `workspace_cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`version_id`) REFERENCES `intel_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_evidence_case_version_idx` ON `workspace_evidence` (`case_id`,`version_id`);--> statement-breakpoint
CREATE TABLE `workspace_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`identifiers` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`identity_basis` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `workspace_projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_object_project_idx` ON `workspace_objects` (`project_id`);--> statement-breakpoint
CREATE TABLE `workspace_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`objective` text NOT NULL,
	`domain` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `workspace_cases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_review_case_idx` ON `workspace_reviews` (`case_id`);