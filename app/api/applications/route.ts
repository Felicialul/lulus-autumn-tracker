import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { applications, interviews, timelineEvents } from "../../../db/schema";

const textFields = ["company", "role", "city", "industry", "jobCategory", "team", "employmentType", "appliedDate", "deadlineDate", "stage", "priority", "applyUrl", "writtenDate", "firstDate", "secondDate", "nextEventDate", "nextAction", "responseDate", "result", "jdText", "notes"] as const;
type TextField = typeof textFields[number];

function clean(body: Record<string, unknown>) {
  const result = {} as Record<TextField, string> & { salaryMin: number; salaryMax: number };
  for (const field of textFields) result[field] = typeof body[field] === "string" ? body[field].trim() : "";
  result.salaryMin = Number(body.salaryMin) || 0;
  result.salaryMax = Number(body.salaryMax) || 0;
  if (result.stage === "已投递" && result.appliedDate) {
    if (!result.nextAction) result.nextAction = "7 天后查看投递进度";
    if (!result.nextEventDate) {
      const followUp = new Date(`${result.appliedDate}T09:00:00`);
      followUp.setDate(followUp.getDate() + 7);
      result.nextEventDate = `${followUp.toISOString().slice(0, 10)}T09:00`;
    }
  }
  return result;
}

async function syncSchedule(application: typeof applications.$inferSelect) {
  const db = getDb();
  const events: Array<{ stage:string; date:string; time:string; notice:string }> = [];
  if (application.deadlineDate) events.push({ stage:"网申截止", date:application.deadlineDate, time:"23:59", notice:"由投递记录自动生成" });
  if (application.nextEventDate) {
    const [date,time="09:00"] = application.nextEventDate.split("T");
    const stage = ["笔试","一面","二面","终面","HR面","Offer"].includes(application.stage) ? application.stage : "跟进";
    events.push({ stage, date, time, notice:application.nextAction || "由下一步行动自动生成" });
  }
  for (const event of events) {
    const [existing] = await db.select().from(interviews).where(and(eq(interviews.applicationId, application.id), eq(interviews.stage, event.stage))).limit(1);
    const values = { applicationId:application.id, company:application.company, role:application.role, stage:event.stage, date:event.date, time:event.time, format:"待办", link:"", address:"", interviewer:"", reminderAt:"", notice:event.notice, prep:application.nextAction, review:"" };
    if (existing) await db.update(interviews).set(values).where(eq(interviews.id, existing.id));
    else await db.insert(interviews).values(values);
  }
}

function messageFor(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) return "云端数据表还在初始化，请稍后重试。";
  return message;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const values = clean(body);
    if (!values.company || !values.role) return Response.json({ error: "公司名称和岗位名称不能为空" }, { status: 400 });
    const db = getDb();
    const [application] = await db.insert(applications).values(values).returning();
    await db.insert(timelineEvents).values({ applicationId: application.id, type: "创建", title: values.stage === "待投递" ? "加入待投递清单" : `状态：${values.stage}`, occurredAt: values.appliedDate || new Date().toISOString(), notes: "" });
    await syncSchedule(application);
    return Response.json({ application }, { status: 201 });
  } catch (error) { return Response.json({ error: messageFor(error) }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    const values = clean(body);
    if (!id || !values.company || !values.role) return Response.json({ error: "记录信息不完整" }, { status: 400 });
    const db = getDb();
    const [before] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    const [application] = await db.update(applications).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(applications.id, id)).returning();
    if (!application) return Response.json({ error: "记录不存在" }, { status: 404 });
    if (before && before.stage !== values.stage) await db.insert(timelineEvents).values({ applicationId: id, type: "状态变更", title: `${before.stage} → ${values.stage}`, occurredAt: new Date().toISOString(), notes: values.notes });
    await syncSchedule(application);
    return Response.json({ application });
  } catch (error) { return Response.json({ error: messageFor(error) }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return Response.json({ error: "缺少记录 id" }, { status: 400 });
    await getDb().delete(applications).where(eq(applications.id, id));
    return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: messageFor(error) }, { status: 500 }); }
}
