/** Local, deterministic parsing. Source text is never sent to an AI service. */
import * as XLSX from "xlsx";

export type RecruitmentDraft = { company: string; role: string; url: string; referralCode: string; notes: string };
const blank = (): RecruitmentDraft => ({ company: "", role: "", url: "", referralCode: "", notes: "" });
const companyHeaders = /^(公司|公司名|公司名称|企业|企业名称)$/u;
const roleHeaders = /^(岗位|岗位名|岗位名称|职位|职位名|职位名称|岗位\/项目|项目\/岗位|职位\/项目|岗位项目)$/u;
const urlHeaders = /^(链接|岗位链接|招聘链接|投递链接|内推链接|网申地址|投递地址|官网链接|url)$/iu;
const codeHeaders = /^(内推码|推荐码|内推代码|referralcode)$/iu;
const clean = (v: unknown) => String(v ?? "").trim();
const header = (v: unknown) => clean(v).normalize("NFKC").replace(/\s/g, "");

export function safeRecruitmentUrl(value: string) {
  const raw = value.trim();
  if (!/^https?:\/\//i.test(raw)) return "";
  try { const url = new URL(raw); return url.hostname && !url.username && !url.password ? raw : ""; } catch { return ""; }
}

export function referralFromNotes(notes = "") {
  return notes.match(/(?:^|\n)(?:内推码|推荐码)\s*[:：]\s*([^\s]+)/u)?.[1] || "";
}

export function withReferral(notes: string, code: string) {
  const rest = (notes || "").replace(/(?:^|\n)(?:内推码|推荐码)\s*[:：][^\n]*/gu, "").trim();
  return [code.trim() ? `内推码：${code.trim()}` : "", rest].filter(Boolean).join("\n");
}

export function recruitmentKey(item: { company: string; role: string }) {
  return [item.company, item.role || "岗位待确认"].map(v => v.normalize("NFKC").replace(/\s/g, "").toLowerCase()).join("\0");
}

// Keep differing links/codes visible for review; the save step deduplicates company + role.
export function distinctCandidates(items: RecruitmentDraft[]) {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${recruitmentKey(item)}\0${item.url}\0${item.referralCode}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export function recruitmentFromTable(rows: unknown[][]): RecruitmentDraft[] {
  const start = rows.findIndex(row => row.some(v => companyHeaders.test(header(v))));
  if (start < 0) return [];
  const fields = rows[start].map(v => header(v));
  const index = (pattern: RegExp) => fields.findIndex(v => pattern.test(v));
  const ci = index(companyHeaders), ri = index(roleHeaders), ui = index(urlHeaders), ni = index(/^备注$/u), codei = index(codeHeaders);
  return distinctCandidates(rows.slice(start + 1).map(row => ({
    company: clean(row[ci]), role: clean(row[ri]), url: clean(row[ui]),
    referralCode: clean(row[codei]) || referralFromNotes(clean(row[ni])), notes: clean(row[ni]),
  })).filter(row => row.company && !/^\d+$/.test(row.company) && !companyHeaders.test(header(row.company)) && !/^(合计|总计|统计|使用说明)/u.test(row.company)));
}

export function recruitmentFromWorkbook(buffer: ArrayBuffer): RecruitmentDraft[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const candidates: RecruitmentDraft[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as unknown[][];
    const hi = rows.findIndex(row => row.some(value => companyHeaders.test(header(value))));
    if (hi < 0) continue;
    const fields = rows[hi].map(header);
    let ui = fields.findIndex(value => urlHeaders.test(value));
    const hasLinkColumn = ui >= 0;
    if (!hasLinkColumn) { ui = Math.max(...rows.map(row => row.length)); rows[hi][ui] = "岗位链接"; }
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    for (let i = hi + 1; i < rows.length; i++) {
      const columns = hasLinkColumn ? [ui] : fields.flatMap((value, col) => companyHeaders.test(value) || roleHeaders.test(value) ? [col] : []);
      for (const col of columns) {
        const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r + i, c: range.s.c + col })];
        if (cell?.l?.Target && safeRecruitmentUrl(cell.l.Target)) { rows[i][ui] = cell.l.Target; break; }
      }
    }
    candidates.push(...recruitmentFromTable(rows));
  }
  return distinctCandidates(candidates);
}

function splitDelimited(text: string, delimiter: string) {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += c; i++; } else quoted = !quoted; }
    else if (!quoted && (c === delimiter || c === "\n")) { row.push(cell); cell = ""; if (c === "\n") { rows.push(row); row = []; } }
    else cell += c;
  }
  row.push(cell); rows.push(row); return rows;
}

function headingFields(heading: string): { company: string; roles: string[] } {
  const h = heading.replace(/^[\s\p{Extended_Pictographic}\uFE0F⭐☆★#•·\-]+/gu, "").replace(/^\d+[.、]\s*/u, "").trim();
  if (!h || /合集|汇总|交流[群组]|https?:|专属咨询|邮箱|@/u.test(h)) return { company: "", roles: [] };
  const separated = h.match(/^(.{2,35}?)\s*[|｜：:]\s*(.+)$/u);
  if (separated) return { company: separated[1].trim(), roles: [separated[2].trim()] };
  const season = h.match(/^(.{2,35}?)(?:秋招|春招|校招|校园招聘|招聘|内推)/u);
  if (season) return { company: season[1].trim(), roles: [] };
  const roleStart = h.search(/服务端开发|后端开发|前端开发|客户端开发|数据分析|产品经理|产品运营|运营岗|算法工程师|软件工程师|测试工程师|管培生|AIDU计划/u);
  if (roleStart > 0) {
    const roles = h.slice(roleStart).split(/目前|近期|急招|，|。/u)[0].trim().split(/[\/／、]/u).map(v => v.trim()).filter(Boolean);
    return { company: h.slice(0, roleStart).trim(), roles };
  }
  const spaced = h.match(/^([^\s]{2,30})\s+(.+)$/u);
  if (spaced) return { company: spaced[1], roles: [spaced[2]] };
  return /^[\p{L}\p{N}·&()（）-]{2,30}$/u.test(h) ? { company: h, roles: [] } : { company: "", roles: [] };
}

export function recruitmentFromText(source: string): RecruitmentDraft[] {
  // Join only explicit URL continuations; preserve case, query parameters and fragments verbatim.
  const text = source.replace(/\r\n?/g, "\n").replace(/(https?:\/\/[^\s]*[?&=])\n\s*(?=[A-Za-z0-9_%])/g, "$1");
  for (const separator of ["\t", "|", "｜", ","]) {
    const result = recruitmentFromTable(splitDelimited(text, separator));
    if (result.length) return result;
  }
  const records: RecruitmentDraft[] = []; let current = blank(), roles: string[] = [], sourceLines: string[] = [];
  const flush = () => {
    if (current.company || current.url) {
      for (const role of roles.length ? roles : [current.role]) records.push({ ...current, role, notes: sourceLines.join("\n") });
    }
    current = blank(); roles = []; sourceLines = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || /^[_—─=-]{3,}$/.test(line)) continue;
    const companyLabel = line.match(/^(?:公司|公司名|公司名称|企业名称)\s*[:：]\s*(.+)$/u);
    const roleLabel = line.match(/^(?:岗位|岗位名|岗位名称|职位|职位名称)\s*[:：]\s*(.+)$/u);
    const codeLabel = line.match(/(?:内推码|推荐码)\s*[:：]\s*([^\s]+)/u);
    const urls = line.match(/https?:\/\/[^\s<>"“”]+/gi) || [];
    const url = urls[0]?.replace(/[，。；、）)]+$/u, "") || "";
    const beforeUrl = url ? line.slice(0, line.search(/https?:/i)).replace(/(?:内推链接|投递链接|招聘链接|网申地址|链接)\s*[:：]?\s*$/u, "").trim() : line;
    if (companyLabel) { flush(); current.company = companyLabel[1].trim(); }
    else if (roleLabel) { current.role = roleLabel[1].trim(); roles = []; }
    else if (!codeLabel && !/^(?:网申|内推链接|投递链接|招聘链接|地址|链接|推荐码|内推码|【校园招聘】)/u.test(line)) {
      const parsed = headingFields(beforeUrl);
      if (parsed.company) { flush(); current.company = parsed.company; roles = parsed.roles; }
    }
    if (url) current.url = url;
    if (codeLabel) current.referralCode = codeLabel[1];
    sourceLines.push(line);
  }
  flush(); return distinctCandidates(records);
}
