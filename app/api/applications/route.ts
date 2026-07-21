import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { applications } from "../../../db/schema";

const fields = ["company", "role", "city", "team", "source", "appliedDate", "deadlineDate", "stage", "priority", "applyUrl", "writtenDate", "firstDate", "secondDate", "result", "notes"] as const;
type Field = typeof fields[number];

function clean(body: Record<string, unknown>) {
  const result = {} as Record<Field, string>;
  for (const field of fields) result[field] = typeof body[field] === "string" ? body[field].trim() : "";
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
    const [application] = await getDb().insert(applications).values(values).returning();
    return Response.json({ application }, { status: 201 });
  } catch (error) { return Response.json({ error: messageFor(error) }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    const values = clean(body);
    if (!id || !values.company || !values.role) return Response.json({ error: "记录信息不完整" }, { status: 400 });
    const [application] = await getDb().update(applications).set({ ...values, updatedAt: new Date().toISOString() }).where(eq(applications.id, id)).returning();
    if (!application) return Response.json({ error: "记录不存在" }, { status: 404 });
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
