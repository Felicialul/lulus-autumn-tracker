import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { resumes } from "../../../db/schema";

function values(body: Record<string, unknown>) { return { name: String(body.name || "").trim(), direction: String(body.direction || "").trim(), version: String(body.version || "V1").trim(), attachmentId: Number(body.attachmentId) || null, notes: String(body.notes || "").trim() }; }
export async function POST(request: Request) { try { const data = values(await request.json()); if (!data.name) return Response.json({ error: "简历名称不能为空" }, { status: 400 }); const [item] = await getDb().insert(resumes).values(data).returning(); return Response.json({ item }, { status: 201 }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 }); } }
export async function PATCH(request: Request) { try { const body = await request.json() as Record<string, unknown>; const [item] = await getDb().update(resumes).set(values(body)).where(eq(resumes.id, Number(body.id))).returning(); return Response.json({ item }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 }); } }
export async function DELETE(request: Request) { try { const id = Number(new URL(request.url).searchParams.get("id")); await getDb().delete(resumes).where(eq(resumes.id, id)); return Response.json({ ok: true }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 500 }); } }
