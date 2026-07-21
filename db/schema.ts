import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  city: text("city").notNull().default(""),
  team: text("team").notNull().default(""),
  source: text("source").notNull().default(""),
  appliedDate: text("applied_date").notNull().default(""),
  deadlineDate: text("deadline_date").notNull().default(""),
  stage: text("stage").notNull().default("待投递"),
  priority: text("priority").notNull().default("中"),
  applyUrl: text("apply_url").notNull().default(""),
  writtenDate: text("written_date").notNull().default(""),
  firstDate: text("first_date").notNull().default(""),
  secondDate: text("second_date").notNull().default(""),
  result: text("result").notNull().default("待定"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const interviews = sqliteTable("interviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  role: text("role").notNull().default(""),
  stage: text("stage").notNull().default("一面"),
  date: text("date").notNull().default(""),
  time: text("time").notNull().default(""),
  format: text("format").notNull().default("线上"),
  link: text("link").notNull().default(""),
  prep: text("prep").notNull().default(""),
  review: text("review").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
