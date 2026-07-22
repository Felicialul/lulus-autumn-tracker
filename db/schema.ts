import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  city: text("city").notNull().default(""),
  industry: text("industry").notNull().default(""),
  jobCategory: text("job_category").notNull().default(""),
  team: text("team").notNull().default(""),
  salaryMin: integer("salary_min").notNull().default(0),
  salaryMax: integer("salary_max").notNull().default(0),
  employmentType: text("employment_type").notNull().default("全职"),
  source: text("source").notNull().default(""),
  referralName: text("referral_name").notNull().default(""),
  referralContact: text("referral_contact").notNull().default(""),
  appliedDate: text("applied_date").notNull().default(""),
  deadlineDate: text("deadline_date").notNull().default(""),
  stage: text("stage").notNull().default("待投递"),
  priority: text("priority").notNull().default("中"),
  applyUrl: text("apply_url").notNull().default(""),
  writtenDate: text("written_date").notNull().default(""),
  firstDate: text("first_date").notNull().default(""),
  secondDate: text("second_date").notNull().default(""),
  nextEventDate: text("next_event_date").notNull().default(""),
  nextAction: text("next_action").notNull().default(""),
  responseDate: text("response_date").notNull().default(""),
  result: text("result").notNull().default("待定"),
  jdText: text("jd_text").notNull().default(""),
  resumeId: integer("resume_id"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const interviews = sqliteTable("interviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  applicationId: integer("application_id"),
  role: text("role").notNull().default(""),
  stage: text("stage").notNull().default("一面"),
  date: text("date").notNull().default(""),
  time: text("time").notNull().default(""),
  format: text("format").notNull().default("线上"),
  link: text("link").notNull().default(""),
  address: text("address").notNull().default(""),
  interviewer: text("interviewer").notNull().default(""),
  reminderAt: text("reminder_at").notNull().default(""),
  notice: text("notice").notNull().default(""),
  prep: text("prep").notNull().default(""),
  review: text("review").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const timelineEvents = sqliteTable("timeline_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull(),
  type: text("type").notNull().default("状态变更"),
  title: text("title").notNull(),
  occurredAt: text("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  notes: text("notes").notNull().default(""),
});

export const knowledgeNotes = sqliteTable("knowledge_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id"),
  category: text("category").notNull().default("面经"),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  tags: text("tags").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const prospects = sqliteTable("prospects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull().default("目标公司"),
  company: text("company").notNull(),
  role: text("role").notNull().default(""),
  city: text("city").notNull().default(""),
  tier: text("tier").notNull().default("稳健"),
  deadlineDate: text("deadline_date").notNull().default(""),
  url: text("url").notNull().default(""),
  reason: text("reason").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const resumes = sqliteTable("resumes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  direction: text("direction").notNull().default(""),
  version: text("version").notNull().default("V1"),
  attachmentId: integer("attachment_id"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const attachments = sqliteTable("attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  filename: text("filename").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull().default("application/octet-stream"),
  size: integer("size").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const offers = sqliteTable("offers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id"),
  company: text("company").notNull(),
  role: text("role").notNull().default(""),
  city: text("city").notNull().default(""),
  baseMonthly: integer("base_monthly").notNull().default(0),
  salaryMonths: real("salary_months").notNull().default(12),
  annualBonus: integer("annual_bonus").notNull().default(0),
  signOn: integer("sign_on").notNull().default(0),
  stockAnnual: integer("stock_annual").notNull().default(0),
  allowanceAnnual: integer("allowance_annual").notNull().default(0),
  housingFundRate: real("housing_fund_rate").notNull().default(0),
  overtimeScore: integer("overtime_score").notNull().default(3),
  growthScore: integer("growth_score").notNull().default(3),
  preferenceScore: integer("preference_score").notNull().default(3),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey().default(1),
  targetCount: integer("target_count").notNull().default(80),
  targetIndustries: text("target_industries").notNull().default(""),
  salaryExpectation: text("salary_expectation").notNull().default(""),
  reminderEnabled: integer("reminder_enabled", { mode: "boolean" }).notNull().default(true),
  reminderLeadHours: integer("reminder_lead_hours").notNull().default(24),
  customTags: text("custom_tags").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
