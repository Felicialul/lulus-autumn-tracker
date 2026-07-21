import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { interviews } from "../../../db/schema";

const textFields = ["company", "role", "stage", "date", "time", "format", "link", "address", "interviewer", "reminderAt", "notice", "prep", "review"] as const;
type TextField = typeof textFields[number];

function clean(body: Record<string, unknown>) {
  const result = {} as Record<TextField, string> & { applicationId: number | null };
  for (const field of textFields) result[field] = typeof body[field] === "string" ? body[field].trim() : "";
  result.applicationId = Number(body.applicationId) || null;
  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const values = clean(body);
    if (!values.company) return Response.json({ error: "公司名称不能为空" }, { status: 400 });
    const [interview] = await getDb().insert(interviews).values(values).returning();
    return Response.json({ interview }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = Number(body.id);
    const values = clean(body);
    if (!id || !values.company) return Response.json({ error: "安排信息不完整" }, { status: 400 });
    const [interview] = await getDb().update(interviews).set(values).where(eq(interviews.id, id)).returning();
    if (!interview) return Response.json({ error: "安排不存在" }, { status: 404 });
    return Response.json({ interview });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!id) return Response.json({ error: "缺少安排 id" }, { status: 400 });
    await getDb().delete(interviews).where(eq(interviews.id, id));
    return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 500 }); }
}
