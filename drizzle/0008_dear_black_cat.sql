ALTER TABLE `workspace_projects` ADD `organization_type` text DEFAULT 'unsure' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace_projects` ADD `industry` text DEFAULT 'unsure' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace_projects` ADD `focus` text DEFAULT '[]' NOT NULL;