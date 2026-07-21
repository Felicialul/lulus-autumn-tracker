"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Application = {
  id: number;
  company: string;
  role: string;
  city: string;
  team: string;
  source: string;
  appliedDate: string;
  deadlineDate: string;
  stage: string;
  priority: string;
  applyUrl: string;
  writtenDate: string;
  firstDate: string;
  secondDate: string;
  result: string;
  notes: string;
};

type Interview = {
  id: number;
  company: string;
  role: string;
  stage: string;
  date: string;
  time: string;
  format: string;
  link: string;
  prep: string;
  review: string;
};

const stages = ["待投递", "已投递", "笔试", "一面", "二面", "HR面", "终面", "Offer", "已拒绝"];
const priorities = ["高", "中", "低"];
const results = ["待定", "通过", "Offer", "已拒绝", "已放弃", "待复盘"];
const interviewStages = ["笔试", "群面", "一面", "二面", "HR面", "终面", "其他"];
const interviewFormats = ["线上", "线下", "电话", "其他"];

const emptyApplication: Omit<Application, "id"> = {
  company: "", role: "", city: "", team: "", source: "", appliedDate: "", deadlineDate: "",
  stage: "待投递", priority: "中", applyUrl: "", writtenDate: "", firstDate: "", secondDate: "",
  result: "待定", notes: "",
};

const emptyInterview: Omit<Interview, "id"> = {
  company: "", role: "", stage: "一面", date: "", time: "", format: "线上", link: "", prep: "", review: "",
};

function daysUntil(value: string) {
  if (!value) return null;
  const today = new Date();
  const deadline = new Date(`${value}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

function dateLabel(value: string) {
  if (!value) return "未安排";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", weekday: "short" }).format(date);
}

function cls(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}

function StatusPill({ value, kind = "stage" }: { value: string; kind?: "stage" | "priority" | "result" }) {
  return <span className={cls("pill", `pill-${kind}`, `pill-${value.replaceAll("面", "-面")}`)}>{value}</span>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="关闭">×</button></div>
        {children}
      </section>
    </div>
  );
}

export default function Home() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"applications" | "interviews">("applications");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("全部阶段");
  const [priorityFilter, setPriorityFilter] = useState("全部优先级");
  const [applicationModal, setApplicationModal] = useState(false);
  const [interviewModal, setInterviewModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [applicationForm, setApplicationForm] = useState(emptyApplication);
  const [interviewForm, setInterviewForm] = useState(emptyInterview);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch("/api/data", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "数据加载失败");
      setApplications(payload.applications || []);
      setInterviews(payload.interviews || []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "连接失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const stats = useMemo(() => {
    const active = applications.filter((item) => !["Offer", "已拒绝"].includes(item.stage)).length;
    const offers = applications.filter((item) => item.stage === "Offer" || item.result === "Offer").length;
    const toApply = applications.filter((item) => item.stage === "待投递").length;
    const urgent = applications.filter((item) => {
      const days = daysUntil(item.deadlineDate);
      return days !== null && days >= 0 && days <= 3 && !["Offer", "已拒绝"].includes(item.stage);
    }).length;
    return { total: applications.length, active, offers, toApply, urgent };
  }, [applications]);

  const filteredApplications = useMemo(() => applications.filter((item) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch = !keyword || [item.company, item.role, item.city, item.team, item.source, item.notes].join(" ").toLowerCase().includes(keyword);
    return matchesSearch && (stageFilter === "全部阶段" || item.stage === stageFilter) && (priorityFilter === "全部优先级" || item.priority === priorityFilter);
  }).sort((a, b) => (daysUntil(a.deadlineDate) ?? 9999) - (daysUntil(b.deadlineDate) ?? 9999)), [applications, priorityFilter, search, stageFilter]);

  function openNewApplication() {
    setEditingApplication(null); setApplicationForm(emptyApplication); setApplicationModal(true);
  }

  function openEditApplication(item: Application) {
    setEditingApplication(item); setApplicationForm({ ...item }); setApplicationModal(true);
  }

  async function submitApplication(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/applications", { method: editingApplication ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingApplication ? { ...applicationForm, id: editingApplication.id } : applicationForm) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "保存失败");
      setApplicationModal(false); await loadData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存失败，请重试"); } finally { setSaving(false); }
  }

  async function deleteApplication(id: number) {
    if (!window.confirm("确定删除这条投递记录吗？")) return;
    const response = await fetch(`/api/applications?id=${id}`, { method: "DELETE" });
    if (response.ok) await loadData(); else setError("删除失败，请重试");
  }

  function openNewInterview() {
    setEditingInterview(null); setInterviewForm(emptyInterview); setInterviewModal(true);
  }

  function openEditInterview(item: Interview) {
    setEditingInterview(item); setInterviewForm({ ...item }); setInterviewModal(true);
  }

  async function submitInterview(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/interviews", { method: editingInterview ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingInterview ? { ...interviewForm, id: editingInterview.id } : interviewForm) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "保存失败");
      setInterviewModal(false); await loadData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存失败，请重试"); } finally { setSaving(false); }
  }

  async function deleteInterview(id: number) {
    if (!window.confirm("确定删除这条面试安排吗？")) return;
    const response = await fetch(`/api/interviews?id=${id}`, { method: "DELETE" });
    if (response.ok) await loadData(); else setError("删除失败，请重试");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">秋</span><div><p className="eyebrow">PERSONAL CAREER DESK</p><h1>秋招投递管家</h1></div></div>
        <div className="sync-state"><span className={cls("sync-dot", !loading && "is-ready")} />{loading ? "正在同步" : "已同步到云端"}<button className="refresh-button" onClick={() => void loadData()} aria-label="刷新">↻</button></div>
      </header>

      <section className="hero"><div><p className="eyebrow accent">AUTUMN RECRUITING · 2026</p><h2>把每一次投递，变成<br /><em>看得见的进展。</em></h2><p className="hero-copy">电脑、手机都可以打开同一个链接。你填一次，所有设备自动同步。</p></div><div className="hero-note"><span>本周提醒</span><strong>{stats.urgent ? `${stats.urgent} 个岗位临近截止` : "暂无临近截止岗位"}</strong><small>截止日期在 3 天内的投递</small></div></section>

      <section className="stats-grid"><div className="stat-card"><span>全部岗位</span><strong>{stats.total}</strong><small>已记录的投递</small></div><div className="stat-card"><span>进行中</span><strong>{stats.active}</strong><small>还在推进的机会</small></div><div className="stat-card highlight"><span>Offer</span><strong>{stats.offers}</strong><small>拿到的结果</small></div><div className="stat-card"><span>待投递</span><strong>{stats.toApply}</strong><small>准备出手的岗位</small></div></section>

      <section className="workspace-card">
        <div className="workspace-head"><div className="tabs"><button className={cls(activeTab === "applications" && "active")} onClick={() => setActiveTab("applications")}>投递记录 <span>{applications.length}</span></button><button className={cls(activeTab === "interviews" && "active")} onClick={() => setActiveTab("interviews")}>面试日历 <span>{interviews.length}</span></button></div><button className="primary-button" onClick={activeTab === "applications" ? openNewApplication : openNewInterview}>＋ {activeTab === "applications" ? "新增投递" : "新增安排"}</button></div>
        {error && <div className="error-banner">{error}</div>}
        {activeTab === "applications" ? <>
          <div className="filters"><div className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索公司、岗位、城市…" /></div><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option>全部阶段</option>{stages.map((item) => <option key={item}>{item}</option>)}</select><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>全部优先级</option>{priorities.map((item) => <option key={item}>{item}</option>)}</select></div>
          {loading ? <div className="empty-state"><span className="loader" />正在读取你的投递记录…</div> : filteredApplications.length === 0 ? <div className="empty-state"><div className="empty-icon">✦</div><h3>{applications.length ? "没有匹配的岗位" : "从第一条投递开始"}</h3><p>{applications.length ? "换个关键词或筛选条件试试。" : "把你投递过的岗位放进来，后续进展会更清晰。"}</p><button className="primary-button" onClick={openNewApplication}>＋ 新增第一条投递</button></div> : <div className="table-wrap"><table><thead><tr><th>公司 / 岗位</th><th>城市</th><th>当前阶段</th><th>优先级</th><th>投递日期</th><th>截止日期</th><th>结果</th><th /></tr></thead><tbody>{filteredApplications.map((item) => { const days = daysUntil(item.deadlineDate); return <tr key={item.id} onClick={() => openEditApplication(item)}><td><div className="company-cell"><strong>{item.company}</strong><span>{item.role}{item.team ? ` · ${item.team}` : ""}</span></div></td><td>{item.city || "—"}</td><td><StatusPill value={item.stage} /></td><td><StatusPill value={item.priority} kind="priority" /></td><td>{item.appliedDate || "—"}</td><td><div className={cls("deadline", days !== null && days >= 0 && days <= 3 && "deadline-soon", days !== null && days < 0 && "deadline-past")}>{item.deadlineDate || "—"}{days !== null && <small>{days < 0 ? `已过期 ${Math.abs(days)} 天` : days === 0 ? "今天截止" : `还剩 ${days} 天`}</small>}</div></td><td><StatusPill value={item.result} kind="result" /></td><td><button className="row-menu" onClick={(event) => { event.stopPropagation(); void deleteApplication(item.id); }} aria-label="删除">⋯</button></td></tr>; })}</tbody></table></div>}
        </> : <>
          {loading ? <div className="empty-state"><span className="loader" />正在读取面试安排…</div> : interviews.length === 0 ? <div className="empty-state"><div className="empty-icon">◷</div><h3>还没有面试安排</h3><p>把笔试和面试时间集中记下来，准备起来更从容。</p><button className="primary-button" onClick={openNewInterview}>＋ 新增面试安排</button></div> : <div className="interview-list">{[...interviews].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999")).map((item) => <article className="interview-item" key={item.id} onClick={() => openEditInterview(item)}><div className="date-block"><strong>{item.date ? item.date.slice(5).replace("-", ".") : "待定"}</strong><span>{item.date ? dateLabel(item.date).split(" ").slice(-1)[0] : "日期"}</span></div><div className="interview-main"><div className="interview-title"><strong>{item.company}</strong><StatusPill value={item.stage} /></div><p>{item.role || "未填写岗位"} · {item.time || "时间待定"} · {item.format}</p>{item.prep && <small>准备：{item.prep}</small>}</div><div className="interview-action">{item.link && <a href={item.link} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>打开链接 ↗</a>}<button className="row-menu" onClick={(event) => { event.stopPropagation(); void deleteInterview(item.id); }} aria-label="删除">⋯</button></div></article>)}</div>}
        </>}
      </section>

      <footer><span>数据由云端保存，换设备也能继续。</span><span>仅供个人使用 · 记得定期复盘</span></footer>

      {applicationModal && <Modal title={editingApplication ? "编辑投递记录" : "新增投递记录"} onClose={() => setApplicationModal(false)}><form className="form" onSubmit={submitApplication}><div className="form-grid"><label>公司名称<input required value={applicationForm.company} onChange={(event) => setApplicationForm({ ...applicationForm, company: event.target.value })} placeholder="例如：京东" /></label><label>岗位名称<input required value={applicationForm.role} onChange={(event) => setApplicationForm({ ...applicationForm, role: event.target.value })} placeholder="例如：产品经理" /></label><label>城市<input value={applicationForm.city} onChange={(event) => setApplicationForm({ ...applicationForm, city: event.target.value })} placeholder="北京 / 上海 / 杭州" /></label><label>部门 / 业务线<input value={applicationForm.team} onChange={(event) => setApplicationForm({ ...applicationForm, team: event.target.value })} placeholder="选填" /></label><label>投递来源<input value={applicationForm.source} onChange={(event) => setApplicationForm({ ...applicationForm, source: event.target.value })} placeholder="官网 / 内推 / 招聘平台" /></label><label>当前阶段<select value={applicationForm.stage} onChange={(event) => setApplicationForm({ ...applicationForm, stage: event.target.value })}>{stages.map((item) => <option key={item}>{item}</option>)}</select></label><label>优先级<select value={applicationForm.priority} onChange={(event) => setApplicationForm({ ...applicationForm, priority: event.target.value })}>{priorities.map((item) => <option key={item}>{item}</option>)}</select></label><label>结果<select value={applicationForm.result} onChange={(event) => setApplicationForm({ ...applicationForm, result: event.target.value })}>{results.map((item) => <option key={item}>{item}</option>)}</select></label><label>投递日期<input type="date" value={applicationForm.appliedDate} onChange={(event) => setApplicationForm({ ...applicationForm, appliedDate: event.target.value })} /></label><label>截止日期<input type="date" value={applicationForm.deadlineDate} onChange={(event) => setApplicationForm({ ...applicationForm, deadlineDate: event.target.value })} /></label><label>笔试日期<input type="date" value={applicationForm.writtenDate} onChange={(event) => setApplicationForm({ ...applicationForm, writtenDate: event.target.value })} /></label><label>一面日期<input type="date" value={applicationForm.firstDate} onChange={(event) => setApplicationForm({ ...applicationForm, firstDate: event.target.value })} /></label><label>二面 / HR 面日期<input type="date" value={applicationForm.secondDate} onChange={(event) => setApplicationForm({ ...applicationForm, secondDate: event.target.value })} /></label><label className="span-2">网申链接<input type="url" value={applicationForm.applyUrl} onChange={(event) => setApplicationForm({ ...applicationForm, applyUrl: event.target.value })} placeholder="https://…" /></label><label className="span-2">备注<textarea value={applicationForm.notes} onChange={(event) => setApplicationForm({ ...applicationForm, notes: event.target.value })} placeholder="联系人、JD 重点、复盘等" rows={3} /></label></div><div className="form-actions"><button type="button" className="ghost-button" onClick={() => setApplicationModal(false)}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中…" : "保存记录"}</button></div></form></Modal>}
      {interviewModal && <Modal title={editingInterview ? "编辑面试安排" : "新增面试安排"} onClose={() => setInterviewModal(false)}><form className="form" onSubmit={submitInterview}><div className="form-grid"><label>公司名称<input required value={interviewForm.company} onChange={(event) => setInterviewForm({ ...interviewForm, company: event.target.value })} /></label><label>岗位名称<input value={interviewForm.role} onChange={(event) => setInterviewForm({ ...interviewForm, role: event.target.value })} /></label><label>面试环节<select value={interviewForm.stage} onChange={(event) => setInterviewForm({ ...interviewForm, stage: event.target.value })}>{interviewStages.map((item) => <option key={item}>{item}</option>)}</select></label><label>形式<select value={interviewForm.format} onChange={(event) => setInterviewForm({ ...interviewForm, format: event.target.value })}>{interviewFormats.map((item) => <option key={item}>{item}</option>)}</select></label><label>日期<input type="date" value={interviewForm.date} onChange={(event) => setInterviewForm({ ...interviewForm, date: event.target.value })} /></label><label>时间<input type="time" value={interviewForm.time} onChange={(event) => setInterviewForm({ ...interviewForm, time: event.target.value })} /></label><label className="span-2">地点 / 会议链接<input value={interviewForm.link} onChange={(event) => setInterviewForm({ ...interviewForm, link: event.target.value })} placeholder="会议链接或办公地点" /></label><label className="span-2">准备重点<textarea value={interviewForm.prep} onChange={(event) => setInterviewForm({ ...interviewForm, prep: event.target.value })} rows={3} placeholder="面试前要准备什么？" /></label><label className="span-2">结果 / 复盘<textarea value={interviewForm.review} onChange={(event) => setInterviewForm({ ...interviewForm, review: event.target.value })} rows={3} placeholder="结束后补充记录" /></label></div><div className="form-actions"><button type="button" className="ghost-button" onClick={() => setInterviewModal(false)}>取消</button><button className="primary-button" disabled={saving}>{saving ? "保存中…" : "保存安排"}</button></div></form></Modal>}
    </main>
  );
}
