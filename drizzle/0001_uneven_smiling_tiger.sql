CREATE TABLE `padel_matches` (
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
	`court_number` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`teammate_left`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teammate_right`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opponent_left`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opponent_right`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `persons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
