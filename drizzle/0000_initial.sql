CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`primary_target` text NOT NULL,
	`secondary_target` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`subcategory` text,
	`item` text NOT NULL,
	`amount` real NOT NULL,
	`shop` text,
	`month` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_expenses_date` ON `expenses` (`date`);--> statement-breakpoint
CREATE INDEX `idx_expenses_category` ON `expenses` (`category`);--> statement-breakpoint
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
	`is_public` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habits_key_unique` ON `habits` (`key`);--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_date` text NOT NULL,
	`person_id` integer,
	`rank` integer,
	`note` text,
	`sentiment` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_interactions_entry_date` ON `interactions` (`entry_date`);--> statement-breakpoint
CREATE INDEX `idx_interactions_person_id` ON `interactions` (`person_id`);--> statement-breakpoint
CREATE TABLE `padel_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`match_id` integer NOT NULL,
	`set_number` integer NOT NULL,
	`teammate_left` integer NOT NULL,
	`teammate_right` integer NOT NULL,
	`opponent_left` integer NOT NULL,
	`opponent_right` integer NOT NULL,
	`games_won` integer NOT NULL,
	`games_lost` integer NOT NULL,
	`format` text,
	`venue` text,
	`court_number` text,
	`video_url` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`teammate_left`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teammate_right`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opponent_left`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opponent_right`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_padel_sets_date` ON `padel_sets` (`date`);--> statement-breakpoint
CREATE INDEX `idx_padel_sets_match_id_set` ON `padel_sets` (`match_id`,`set_number`);--> statement-breakpoint
CREATE INDEX `idx_padel_sets_teammate_left` ON `padel_sets` (`teammate_left`);--> statement-breakpoint
CREATE INDEX `idx_padel_sets_teammate_right` ON `padel_sets` (`teammate_right`);--> statement-breakpoint
CREATE INDEX `idx_padel_sets_opponent_left` ON `padel_sets` (`opponent_left`);--> statement-breakpoint
CREATE INDEX `idx_padel_sets_opponent_right` ON `padel_sets` (`opponent_right`);--> statement-breakpoint
CREATE TABLE `persons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`nickname` text,
	`image_url` text
);
--> statement-breakpoint
CREATE TABLE `sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`block` text NOT NULL,
	`week` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`planned` real,
	`actual` real,
	`measure` text,
	`value` real,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sets_date` ON `sets` (`date`);--> statement-breakpoint
CREATE INDEX `idx_sets_exercise_id` ON `sets` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `thoughts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_date` text NOT NULL,
	`thought` text NOT NULL,
	`type` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_thoughts_entry_date` ON `thoughts` (`entry_date`);--> statement-breakpoint
CREATE TABLE `transports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`event_type` text NOT NULL,
	`mode` text,
	`item` text,
	`origin` text,
	`destination` text,
	`notes` text,
	`video_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_transports_date` ON `transports` (`date`);--> statement-breakpoint
CREATE INDEX `idx_transports_event_type_mode` ON `transports` (`event_type`,`mode`);--> statement-breakpoint
CREATE TABLE `visitor_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message` text NOT NULL,
	`sender_handle` text,
	`reply` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
