import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { timelineEvents } from "../../../db/schema";

function values(body: Record<string, unknown>) {
  return { applicationId: Number(body.applicationId) || 0, type: String(body.type || "自定义节点").trim(), title: String(body.title || "").trim(), occurredAt: String(body.occurredAt || new Date().toISOString()).trim(), notes: String(body.notes || "").trim() };
}
export async function POST(request: Request) { try { const data = values(await request.json()); if (!data.applicationId || !data.title) return Response.json({ error: "关联投递和节点标题不能为空" }, { status: 400 }); const [item] = await getDb().insert(timelineEvents).values(data).returning(); return Response.json({ item }, { status: 201 }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 }); } }
export async function DELETE(request: Request) { try { const id = Number(new URL(request.url).searchParams.get("id")); await getDb().delete(timelineEvents).where(eq(timelineEvents.id, id)); return Response.json({ ok: true }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 500 }); } }
