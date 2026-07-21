import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { applications, attachments, interviews, knowledgeNotes, offers, prospects, timelineEvents, userSettings } from "../../../db/schema";

function messageFor(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) return "云端数据表还在初始化，请稍后刷新一次。";
  return message;
}

export async function GET() {
  try {
    const db = getDb();
    const [applicationRows, interviewRows, timelineRows, noteRows, prospectRows, offerRows, attachmentRows, settingsRows] = await Promise.all([
      db.select().from(applications).orderBy(desc(applications.updatedAt), desc(applications.id)),
      db.select().from(interviews).orderBy(desc(interviews.date), desc(interviews.id)),
      db.select().from(timelineEvents).orderBy(desc(timelineEvents.occurredAt), desc(timelineEvents.id)),
      db.select().from(knowledgeNotes).orderBy(desc(knowledgeNotes.updatedAt), desc(knowledgeNotes.id)),
      db.select().from(prospects).orderBy(desc(prospects.createdAt), desc(prospects.id)),
      db.select().from(offers).orderBy(desc(offers.createdAt), desc(offers.id)),
      db.select().from(attachments).orderBy(desc(attachments.createdAt), desc(attachments.id)),
      db.select().from(userSettings).limit(1),
    ]);
    return Response.json({ applications: applicationRows, interviews: interviewRows, timeline: timelineRows, notes: noteRows, prospects: prospectRows, offers: offerRows, attachments: attachmentRows, settings: settingsRows[0] ?? null });
  } catch (error) {
    return Response.json({ error: messageFor(error) }, { status: 500 });
  }
}
