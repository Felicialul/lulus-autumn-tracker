import { apiUrl } from "./api-url";

type JsonRecord = Record<string, unknown>;
type CollectionName = "applications" | "interviews" | "timeline" | "notes" | "prospects" | "offers" | "attachments";
type TrackerData = Record<CollectionName, JsonRecord[]> & { settings: JsonRecord | null };

const TOKEN_KEY = "lulu-github-data-token-v1";
const DATA_FILE = "tracker.json";
const EMPTY_DATA: TrackerData = {
  applications: [], interviews: [], timeline: [], notes: [], prospects: [], offers: [], attachments: [], settings: null,
};

let mutationQueue: Promise<unknown> = Promise.resolve();

function config() {
  return typeof window === "undefined" ? undefined : window.__LULU_GITHUB_DATA__;
}

export function isGithubDataMode() {
  return Boolean(config());
}

export function getStoredGithubToken() {
  return typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY) || "";
}

export function storeGithubToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearGithubToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function githubHeaders(token = getStoredGithubToken()) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function repoUrl(suffix = "") {
  const repo = config();
  if (!repo) throw new Error("未配置 GitHub 数据仓库");
  return `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}${suffix}`;
}

function authFailure() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("lulu-github-auth-invalid"));
}

async function githubRequest(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { ...githubHeaders(), ...(init.headers || {}) } });
  if (response.status === 401 || response.status === 403) authFailure();
  return response;
}

export async function validateGithubToken(token: string) {
  if (!token.trim()) throw new Error("请先粘贴访问密钥");
  const response = await fetch(repoUrl(), { headers: githubHeaders(token.trim()) });
  if (response.status === 401) throw new Error("访问密钥无效或已过期");
  if (response.status === 403) throw new Error("访问密钥没有读取数据仓库的权限");
  if (response.status === 404) throw new Error("访问密钥未获授权访问私有数据仓库");
  if (!response.ok) throw new Error(`连接 GitHub 失败（${response.status}）`);
}

function decodeBase64(value: string) {
  const binary = atob(value.replaceAll("\n", ""));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function normalizeData(value: unknown): TrackerData {
  const source = value && typeof value === "object" ? value as Partial<TrackerData> : {};
  return {
    applications: Array.isArray(source.applications) ? source.applications : [],
    interviews: Array.isArray(source.interviews) ? source.interviews : [],
    timeline: Array.isArray(source.timeline) ? source.timeline : [],
    notes: Array.isArray(source.notes) ? source.notes : [],
    prospects: Array.isArray(source.prospects) ? source.prospects : [],
    offers: Array.isArray(source.offers) ? source.offers : [],
    attachments: Array.isArray(source.attachments) ? source.attachments : [],
    settings: source.settings && typeof source.settings === "object" ? source.settings : null,
  };
}

async function readData(): Promise<{ data: TrackerData; sha: string }> {
  const response = await githubRequest(repoUrl(`/contents/${DATA_FILE}?t=${Date.now()}`), { cache: "no-store" });
  if (response.status === 404) return { data: structuredClone(EMPTY_DATA), sha: "" };
  const payload = await response.json() as { content?: string; sha?: string; message?: string };
  if (!response.ok) throw new Error(payload.message || "读取云端数据失败");
  try {
    return { data: normalizeData(JSON.parse(decodeBase64(payload.content || ""))), sha: payload.sha || "" };
  } catch {
    throw new Error("云端数据文件格式异常，请从备份恢复");
  }
}

async function writeData(data: TrackerData, sha: string) {
  const body: JsonRecord = {
    message: `Update tracker data ${new Date().toISOString()}`,
    content: encodeBase64(JSON.stringify(data)),
  };
  if (sha) body.sha = sha;
  const response = await githubRequest(repoUrl(`/contents/${DATA_FILE}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(payload.message || "保存云端数据失败");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

function nextId(items: JsonRecord[]) {
  return Math.max(0, ...items.map(item => Number(item.id) || 0)) + 1;
}

function cleanKey(value: unknown) {
  return String(value || "").trim().toLocaleLowerCase().replaceAll(/\s+/g, "");
}

function duplicateKey(item: JsonRecord) {
  return `${cleanKey(item.company)}::${cleanKey(item.role)}`;
}

function parseBody(init?: RequestInit): JsonRecord {
  if (!init?.body || typeof init.body !== "string") return {};
  try { return JSON.parse(init.body) as JsonRecord; } catch { return {}; }
}

function collectionFor(pathname: string): CollectionName | null {
  const key = pathname.replace(/^\/api\//, "").split("/")[0];
  return (["applications", "interviews", "timeline", "notes", "prospects", "offers", "attachments"] as CollectionName[]).includes(key as CollectionName) ? key as CollectionName : null;
}

function createTimeline(data: TrackerData, application: JsonRecord, title?: string) {
  data.timeline.unshift({
    id: nextId(data.timeline),
    applicationId: Number(application.id),
    type: title ? "状态变更" : "创建",
    title: title || (application.stage === "待投递" ? "加入待投递清单" : `状态：${application.stage || "已投递"}`),
    occurredAt: String(application.appliedDate || new Date().toISOString()),
    notes: "",
  });
}

async function mutate(handler: (data: TrackerData) => { payload: unknown; status?: number }) {
  const task = mutationQueue.then(async () => {
    const { data, sha } = await readData();
    const result = handler(data);
    await writeData(data, sha);
    return json(result.payload, result.status || 200);
  });
  mutationQueue = task.catch(() => undefined);
  return task;
}

async function handleGithubApi(path: string, init: RequestInit = {}) {
  const url = new URL(path, window.location.origin);
  const method = (init.method || "GET").toUpperCase();
  const body = parseBody(init);
  if (url.pathname === "/api/data" && method === "GET") return json((await readData()).data);
  if (url.pathname === "/api/files") return json({ error: "GitHub 同步版暂不支持附件上传，请先使用备注或链接保存资料。" }, 501);
  if (url.pathname === "/api/settings" && method === "PUT") return mutate(data => {
    data.settings = { ...body, id: 1, updatedAt: new Date().toISOString() };
    return { payload: { item: data.settings } };
  });

  const collection = collectionFor(url.pathname);
  if (!collection) return json({ error: "不支持的数据操作" }, 404);

  if (method === "POST") return mutate(data => {
    const items = data[collection];
    if ((collection === "applications" || collection === "prospects") && Array.isArray(body.items)) {
      const existing = new Set(items.map(duplicateKey));
      let skipped = 0;
      const created: JsonRecord[] = [];
      for (const raw of body.items as JsonRecord[]) {
        const item = { ...raw };
        const key = duplicateKey(item);
        if (!item.company || !item.role || existing.has(key)) { skipped++; continue; }
        existing.add(key);
        const now = new Date().toISOString();
        const createdItem = { ...item, id: nextId(items), createdAt: item.createdAt || now, updatedAt: item.updatedAt || now };
        items.unshift(createdItem);
        created.push(createdItem);
        if (collection === "applications") createTimeline(data, createdItem);
      }
      return { payload: { applications: created, imported: created.length, skipped }, status: 201 };
    }
    if ((collection === "applications" || collection === "prospects") && (!body.company || !body.role)) return { payload: { error: "公司名称和岗位名称不能为空" }, status: 400 };
    if ((collection === "applications" || collection === "prospects") && items.some(item => duplicateKey(item) === duplicateKey(body))) return { payload: { item: items.find(item => duplicateKey(item) === duplicateKey(body)), skipped: 1 } };
    const now = new Date().toISOString();
    const item = { ...body, id: nextId(items), createdAt: body.createdAt || now, updatedAt: body.updatedAt || now };
    items.unshift(item);
    if (collection === "applications") createTimeline(data, item);
    return { payload: { item }, status: 201 };
  });

  if (method === "PATCH") return mutate(data => {
    const items = data[collection];
    const index = items.findIndex(item => Number(item.id) === Number(body.id));
    if (index < 0) return { payload: { error: "记录不存在" }, status: 404 };
    const before = items[index];
    const item: JsonRecord = { ...before, ...body, updatedAt: new Date().toISOString() };
    items[index] = item;
    if (collection === "applications" && before.stage !== item.stage) createTimeline(data, item, `${before.stage} → ${item.stage}`);
    return { payload: { item } };
  });

  if (method === "DELETE") return mutate(data => {
    const id = Number(url.searchParams.get("id"));
    const items = data[collection];
    const index = items.findIndex(item => Number(item.id) === id);
    if (index >= 0) items.splice(index, 1);
    if (collection === "applications") {
      data.timeline = data.timeline.filter(item => Number(item.applicationId) !== id);
      data.interviews = data.interviews.filter(item => Number(item.applicationId) !== id);
      data.notes = data.notes.map(item => Number(item.applicationId) === id ? { ...item, applicationId: null } : item);
      data.offers = data.offers.map(item => Number(item.applicationId) === id ? { ...item, applicationId: null } : item);
    }
    return { payload: { ok: true } };
  });

  return json({ error: "不支持的数据操作" }, 405);
}

export function apiFetch(path: string, init?: RequestInit) {
  if (isGithubDataMode() && path.startsWith("/api/")) return handleGithubApi(path, init);
  return fetch(apiUrl(path), init);
}
