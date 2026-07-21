CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text DEFAULT 'application/octet-stream' NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `knowledge_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer,
	`category` text DEFAULT '面经' NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer,
	`company` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`base_monthly` integer DEFAULT 0 NOT NULL,
	`salary_months` real DEFAULT 12 NOT NULL,
	`annual_bonus` integer DEFAULT 0 NOT NULL,
	`sign_on` integer DEFAULT 0 NOT NULL,
	`stock_annual` integer DEFAULT 0 NOT NULL,
	`allowance_annual` integer DEFAULT 0 NOT NULL,
	`housing_fund_rate` real DEFAULT 0 NOT NULL,
	`overtime_score` integer DEFAULT 3 NOT NULL,
	`growth_score` integer DEFAULT 3 NOT NULL,
	`preference_score` integer DEFAULT 3 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text DEFAULT '目标公司' NOT NULL,
	`company` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`tier` text DEFAULT '稳健' NOT NULL,
	`deadline_date` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`direction` text DEFAULT '' NOT NULL,
	`version` text DEFAULT 'V1' NOT NULL,
	`attachment_id` integer,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`type` text DEFAULT '状态变更' NOT NULL,
	`title` text NOT NULL,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`target_count` integer DEFAULT 80 NOT NULL,
	`target_industries` text DEFAULT '' NOT NULL,
	`salary_expectation` text DEFAULT '' NOT NULL,
	`reminder_enabled` integer DEFAULT true NOT NULL,
	`reminder_lead_hours` integer DEFAULT 24 NOT NULL,
	`custom_tags` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `applications` ADD `industry` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `job_category` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `salary_min` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `salary_max` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `employment_type` text DEFAULT '全职' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `referral_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `referral_contact` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `next_event_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `response_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `jd_text` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `resume_id` integer;--> statement-breakpoint
ALTER TABLE `interviews` ADD `application_id` integer;--> statement-breakpoint
ALTER TABLE `interviews` ADD `address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `interviewer` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `reminder_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `interviews` ADD `notice` text DEFAULT '' NOT NULL;