import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { applications, timelineEvents } from "../../../db/schema";

const textFields = ["company", "role", "city", "industry", "jobCategory", "team", "employmentType", "appliedDate", "deadlineDate", "stage", "priority", "applyUrl", "writtenDate", "firstDate", "secondDate", "nextEventDate", "responseDate", "result", "jdText", "notes"] as const;
type TextField = typeof textFields[number];

function clean(body: Record<string, unknown>) {
  const result = {} as Record<TextField, string> & { salaryMin: number; salaryMax: number };
  for (const field of textFields) result[field] = typeof body[field] === "string" ? body[field].trim() : "";
  result.salaryMin = Number(body.salaryMin) || 0;
  result.salaryMax = Number(body.salaryMax) || 0;
  return result;
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
