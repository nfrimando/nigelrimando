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
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
