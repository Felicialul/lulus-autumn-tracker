import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { attachments } from "../../../db/schema";

function bucket() {
  const files = (env as unknown as { FILES?: R2Bucket }).FILES;
  if (!files) throw new Error("云端文件存储暂不可用");
  return files;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "请选择文件" }, { status: 400 });
    if (file.size > 15 * 1024 * 1024) return Response.json({ error: "单个文件不能超过 15MB" }, { status: 400 });
    const objectKey = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await bucket().put(objectKey, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { filename: encodeURIComponent(file.name) } });
    const [item] = await getDb().insert(attachments).values({ entityType: String(form.get("entityType") || "general"), entityId: Number(form.get("entityId")) || null, filename: file.name, objectKey, contentType: file.type || "application/octet-stream", size: file.size }).returning();
    return Response.json({ item }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "上传失败" }, { status: 500 }); }
}

export async function GET(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    const [meta] = await getDb().select().from(attachments).where(eq(attachments.id, id)).limit(1);
    if (!meta) return new Response("Not found", { status: 404 });
    const object = await bucket().get(meta.objectKey);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, { headers: { "Content-Type": meta.contentType, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(meta.filename)}` } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "下载失败" }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    const [meta] = await getDb().select().from(attachments).where(eq(attachments.id, id)).limit(1);
    if (meta) await bucket().delete(meta.objectKey);
    await getDb().delete(attachments).where(eq(attachments.id, id));
    return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 500 }); }
}
