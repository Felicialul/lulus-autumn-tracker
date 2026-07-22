CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`team` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`applied_date` text DEFAULT '' NOT NULL,
	`deadline_date` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT '待投递' NOT NULL,
	`priority` text DEFAULT '中' NOT NULL,
	`apply_url` text DEFAULT '' NOT NULL,
	`written_date` text DEFAULT '' NOT NULL,
	`first_date` text DEFAULT '' NOT NULL,
	`second_date` text DEFAULT '' NOT NULL,
	`result` text DEFAULT '待定' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT '一面' NOT NULL,
	`date` text DEFAULT '' NOT NULL,
	`time` text DEFAULT '' NOT NULL,
	`format` text DEFAULT '线上' NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`prep` text DEFAULT '' NOT NULL,
	`review` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
