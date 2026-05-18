CREATE INDEX `idx_expenses_date` ON `expenses` (`date`);--> statement-breakpoint
CREATE INDEX `idx_expenses_category` ON `expenses` (`category`);--> statement-breakpoint
CREATE INDEX `idx_interactions_entry_date` ON `interactions` (`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_interactions_person_id` ON `interactions` (`person_id`);--> statement-breakpoint
CREATE INDEX `idx_padel_sets_date` ON `padel_sets` (`date`);--> statement-breakpoint
CREATE INDEX `idx_sets_date` ON `sets` (`date`);--> statement-breakpoint
CREATE INDEX `idx_thoughts_entry_date` ON `thoughts` (`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_transports_date` ON `transports` (`date`);