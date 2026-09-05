"use client";

import { useEffect, useRef, useState } from "react";
import { distinctCandidates, recruitmentFromTable, recruitmentFromText, recruitmentFromWorkbook, recruitmentKey, safeRecruitmentUrl, withReferral, referralFromNotes } from "../lib/recruitment-import";
import type { RecruitmentDraft } from "../lib/recruitment-import";
import "./recruitment-importer.css";

type PreviewRow = RecruitmentDraft & { selected: boolean };
type SavedDraft = { company: string; role: string; url: string; notes: string };
const MAX_BYTES = 5 * 1024 * 1024;

async function limitedResponse(response: Response) {
  if (!response.body) return new ArrayBuffer(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) { await reader.cancel(); throw new Error("内容超过 5 MB，请精简后上传。"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result.buffer;
}

function htmlCandidates(html: string, base: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,nav,header,footer,noscript").forEach(node => node.remove());
  const linkFor = (a: Element) => { try { return safeRecruitmentUrl(new URL(a.getAttribute("href") || "", base).href); } catch { return ""; } };
  const tables = [...doc.querySelectorAll("table")].flatMap(table => {
    const cells = [...table.querySelectorAll("tr")].map(row => [...row.querySelectorAll("th,td")]);
    const values = cells.map(row => row.map(cell => cell.textContent || ""));
    const hi = values.findIndex(row => row.some(value => /^(公司|公司名|公司名称|企业|企业名称)$/.test(value.trim())));
    if (hi < 0) return [];
    let ui = values[hi].findIndex(value => /链接|网申地址|投递地址|^url$/i.test(value));
    const hasLinkColumn = ui >= 0;
    if (!hasLinkColumn) { ui = Math.max(...values.map(row => row.length)); values[hi][ui] = "岗位链接"; }
    for (let i = hi + 1; i < values.length; i++) {
      const link = hasLinkColumn ? cells[i][ui]?.querySelector("a[href]") : cells[i].flatMap(cell => [...cell.querySelectorAll("a[href]")])[0];
      if (link) values[i][ui] = linkFor(link) || values[i][ui];
    }
    return recruitmentFromTable(values);
  });
  if (tables.length) return distinctCandidates(tables);
  doc.querySelectorAll("a[href]").forEach(a => { const href = linkFor(a); if (href) a.append(doc.createTextNode(` ${href}`)); });
  doc.querySelectorAll("br,p,div,li,h1,h2,h3,h4").forEach(node => { node.append(doc.createTextNode("\n")); });
  return recruitmentFromText(doc.body.textContent || "");
}

export function RecruitmentImporter({ existing, onImport, onClose }: {
  existing: { company: string; role: string }[];
  onImport: (items: SavedDraft[]) => Promise<{ imported?: number; skipped?: number }>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("text"), [text, setText] = useState(""), [url, setUrl] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const existingKeys = new Set(existing.map(recruitmentKey));
  const selected = rows.filter(row => row.selected);
  const invalid = selected.some(row => !row.company.trim() || (row.url.trim() && !safeRecruitmentUrl(row.url)));
  const present = (items: RecruitmentDraft[]) => {
    setRows(items.slice(0, 500).map(row => ({ ...row, selected: !existingKeys.has(recruitmentKey(row)) })));
    setMessage(items.length ? `识别到 ${items.length} 条候选${items.length > 500 ? "，本次仅预览前 500 条" : ""}。请核对公司、岗位和链接；已有收藏默认不勾选。` : "未识别到招聘记录。请粘贴具体内容，或使用包含“公司名称”“岗位名称”“岗位链接”“内推码”表头的表格。");
  };
  const update = (index: number, patch: Partial<PreviewRow>) => setRows(current => current.map((row, i) => i === index ? { ...row, ...patch } : row));
  async function readFile(file: File) {
    setBusy(true); setMessage("正在解析文件…"); setRows([]);
    try {
      if (file.size > MAX_BYTES) throw new Error("请上传 5 MB 以内的文件。");
      if (/\.txt$/i.test(file.name)) present(recruitmentFromText(await file.text()));
      else present(recruitmentFromWorkbook(await file.arrayBuffer()));
    } catch (error) { setMessage(error instanceof Error ? error.message : "解析失败，请检查文件格式或取消加密。"); }
    finally { setBusy(false); }
  }
  async function readUrl() {
    const href = safeRecruitmentUrl(url);
    if (!href || !href.startsWith("https://")) { setMessage("请输入完整的 HTTPS 网页或表格链接。"); return; }
    setRows([]); setBusy(true); setMessage("正在读取链接，最多等待 9 秒…");
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 9000);
    try {
      const response = await fetch(href, { signal: abort.signal, credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok) throw new Error(`网页返回 ${response.status}，请确认链接公开且有效。`);
      if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("文件超过 5 MB，请下载后精简并上传。");
      const buffer = await limitedResponse(response);
      const type = response.headers.get("content-type") || "";
      if (/spreadsheet|excel|csv/i.test(type) || /\.(xlsx?|csv)(?:[?#]|$)/i.test(response.url)) present(recruitmentFromWorkbook(buffer));
      else { const content = new TextDecoder().decode(buffer); present(/html/i.test(type) || /<html/i.test(content) ? htmlCandidates(content, response.url || href) : recruitmentFromText(content)); }
    } catch (error) {
      setMessage(`${abort.signal.aborted ? "读取超时。" : error instanceof TypeError ? "该链接无法由浏览器直接读取（可能是跨域限制或网络异常）。" : error instanceof Error ? error.message : "读取失败。"} 如需登录、内容动态加载或受平台限制，请打开原网页，复制正文/表格粘贴到“群消息 / 文字”，或下载 Excel 后上传。`);
    } finally { clearTimeout(timer); controller.current = null; setBusy(false); }
  }
  async function save() {
    if (invalid || !selected.length) return;
    setBusy(true);
    const seen = new Set(existingKeys); let skipped = 0;
    const items: SavedDraft[] = [];
    for (const row of selected) {
      const key = recruitmentKey(row);
      if (seen.has(key)) { skipped++; continue; }
      seen.add(key);
      items.push({ company: row.company.trim(), role: row.role.trim() || "岗位待确认", url: row.url.trim(), notes: withReferral(row.notes, row.referralCode) });
    }
    try {
      const result = items.length ? await onImport(items) : { imported: 0, skipped: 0 };
      setRows([]); setMessage(`成功导入 ${result.imported || 0} 条，跳过 ${skipped + (result.skipped || 0)} 条重复记录。已有记录未被覆盖。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败，预览已保留，请重试。"); }
    finally { setBusy(false); }
  }
  return <div className="recruitment-importer">
    <div className="segmented" aria-label="选择导入来源">{[["text", "群消息 / 文字"], ["file", "Excel / 文件"], ["url", "网页链接"]].map(([key, label]) => <button key={key} disabled={busy} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === "text" && <div className="form"><label>粘贴群消息、招聘清单或从网页复制的表格<textarea rows={7} value={text} disabled={busy} onChange={e => setText(e.target.value)} placeholder={"公司：示例科技\n岗位：产品经理\n内推链接：https://example.com/jobs\n内推码：ABC123"}/></label><button className="secondary" disabled={busy || !text.trim()} onClick={() => present(recruitmentFromText(text))}>识别内容</button></div>}
    {tab === "file" && <label className="import-drop"><strong>上传 Excel / CSV / TXT</strong><span>支持多工作表、单元格超链接；最大 5 MB</span><input type="file" disabled={busy} accept=".xlsx,.xls,.csv,.txt" onChange={e => { const file = e.target.files?.[0]; if (file) void readFile(file); e.target.value = ""; }}/></label>}
    {tab === "url" && <div className="form"><label>公开网页或表格链接<input type="url" value={url} disabled={busy} onChange={e => setUrl(e.target.value)} placeholder="https://…"/></label><div className="head-actions"><button className="secondary" disabled={busy || !url.trim()} onClick={() => void readUrl()}>读取链接</button>{safeRecruitmentUrl(url) && <a href={safeRecruitmentUrl(url)} target="_blank" rel="noopener noreferrer">打开原网页 ↗</a>}</div><p className="muted">仅支持允许浏览器直接读取的公开内容，不会使用你的登录凭据，也不会把内容发送给第三方解析服务。</p></div>}
    <p className="import-tip">先预览，再导入收藏池。缺失岗位将保存为“岗位待确认”；链接和内推码一起保留。重复项按公司＋岗位判断，不覆盖已有记录。</p>
    {message && <p className="import-message" role="status">{message}</p>}
    {!!rows.length && <><label><input type="checkbox" disabled={busy} checked={rows.every(row => row.selected)} onChange={e => setRows(current => current.map(row => ({ ...row, selected: e.target.checked })))}/> 全选候选 · 已选 {selected.length} / {rows.length}</label>
      <div className="recruitment-preview">{rows.map((row, index) => <article key={index}>
        <label className="recruitment-row-select"><input type="checkbox" disabled={busy} checked={row.selected} onChange={e => update(index, { selected: e.target.checked })}/>第 {index + 1} 条 {existingKeys.has(recruitmentKey(row)) ? "· 已在收藏池" : ""}{!row.role ? " · 岗位待确认" : ""}</label>
        <div className="form-grid">{([["company", "公司名称"], ["role", "岗位名称"], ["url", "招聘链接"], ["referralCode", "内推码"]] as const).map(([field, label]) => <label key={field}>{label}<input disabled={busy} value={row[field]} placeholder={field === "role" ? "岗位待确认（可留空）" : label} onChange={e => update(index, { [field]: e.target.value })}/></label>)}</div>
        {row.url && !safeRecruitmentUrl(row.url) && <p role="alert">链接格式不正确，请改为完整的 http(s) 链接或清空。</p>}
        <details><summary>查看原文 / 备注</summary><p className="recruitment-source">{row.notes || "无补充原文"}</p></details>
      </article>)}</div></>}
    {invalid && <p role="alert">勾选项需要填写公司名称，并修正无效链接。</p>}
    <div className="form-actions"><button className="secondary" disabled={busy} onClick={onClose}>关闭</button><button className="primary" disabled={busy || !selected.length || invalid} onClick={() => void save()}>{busy ? "处理中…" : `导入 ${selected.length} 条收藏`}</button></div>
  </div>;
}

export function ReferralCode({ notes = "" }: { notes?: string }) {
  const code = referralFromNotes(notes);
  const [message, setMessage] = useState("");
  if (!code) return null;
  return <div className="referral-code"><span>内推码：<code>{code}</code></span><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(code); setMessage("已复制"); } catch { setMessage("复制失败，请长按内推码手动复制"); } }}>复制</button>{message && <small role="status">{message}</small>}</div>;
}
