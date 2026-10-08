CREATE TABLE `intel_retrieval_documents` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version_id` text NOT NULL,
	`document_id` text NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`projection_hash` text NOT NULL,
	`projection_version` text NOT NULL,
	`indexed_at` text NOT NULL,
	FOREIGN KEY (`version_id`) REFERENCES `intel_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intel_retrieval_version_idx` ON `intel_retrieval_documents` (`version_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `intel_retrieval_document_idx` ON `intel_retrieval_documents` (`document_id`);