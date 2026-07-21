import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { applications, interviews } from "../../../db/schema";

function messageFor(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) return "云端数据表还在初始化，请稍后刷新一次。";
  return message;
}

export async function GET() {
  try {
    const db = getDb();
    const [applicationRows, interviewRows] = await Promise.all([
      db.select().from(applications).orderBy(desc(applications.updatedAt), desc(applications.id)),
      db.select().from(interviews).orderBy(desc(interviews.date), desc(interviews.id)),
    ]);
    return Response.json({ applications: applicationRows, interviews: interviewRows });
  } catch (error) {
    return Response.json({ error: messageFor(error) }, { status: 500 });
  }
}
