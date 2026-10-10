CREATE TABLE `workspace_project_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`revision` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `workspace_projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_project_revision_idx` ON `workspace_project_revisions` (`project_id`,`revision`);--> statement-breakpoint
ALTER TABLE `workspace_projects` ADD `region` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace_projects` ADD `kind` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace_projects` ADD `profile_revision` integer DEFAULT 0 NOT NULL;