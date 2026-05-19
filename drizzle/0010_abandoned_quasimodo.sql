CREATE TABLE `habit_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`habit_id` integer NOT NULL,
	`numeric_value` real,
	`text_value` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_habit_entries_date` ON `habit_entries` (`date`);--> statement-breakpoint
CREATE INDEX `idx_habit_entries_habit_id` ON `habit_entries` (`habit_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_habit_entries_date_habit` ON `habit_entries` (`date`,`habit_id`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`value_type` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habits_key_unique` ON `habits` (`key`);