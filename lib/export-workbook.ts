import * as XLSX from "xlsx";

type ApplicationRow = {
  id: number; company: string; role: string; city: string; industry: string; jobCategory: string; team: string;
  salaryMin: number; salaryMax: number; employmentType: string; source: string; appliedDate: string; deadlineDate: string;
  stage: string; priority: string; applyUrl: string; writtenDate: string; firstDate: string; secondDate: string;
  nextEventDate: string; nextAction: string; responseDate: string; result: string; jdText: string; notes: string;
  createdAt: string; updatedAt: string;
};
type InterviewRow = { id:number; applicationId:number|null; company:string; role:string; stage:string; date:string; time:string; format:string; link:string; address:string; interviewer:string; reminderAt:string; notice:string; prep:string; review:string; createdAt:string };
type TimelineRow = { id:number; applicationId:number; type:string; title:string; occurredAt:string; notes:string };
type NoteRow = { id:number; applicationId:number|null; category:string; title:string; content:string; tags:string; createdAt:string; updatedAt:string };
type ProspectRow = { company:string; role:string };
type AttachmentRow = { id:number; entityType:string; entityId:number|null; filename:string; contentType:string; size:number; createdAt:string };
type OfferRow = { id:number; applicationId:number|null; company:string; role:string; city:string; baseMonthly:number; salaryMonths:number; annualBonus:number; signOn:number; stockAnnual:number; allowanceAnnual:number; housingFundRate:number; overtimeScore:number; growthScore:number; preferenceScore:number; notes:string; createdAt:string };
type SettingsRow = { targetCount:number; targetIndustries:string; salaryExpectation:string; reminderEnabled:boolean; reminderLeadHours:number; customTags:string };

export type TrackerExportPayload = {
  applications: readonly ApplicationRow[];
  interviews: readonly InterviewRow[];
  timeline: readonly TimelineRow[];
  notes: readonly NoteRow[];
  prospects: readonly ProspectRow[];
  attachments: readonly AttachmentRow[];
  offers: readonly OfferRow[];
  settings: SettingsRow | null;
};

type Cell = string | number | boolean | null;
type SheetRow = Record<string, Cell>;

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: SheetRow[], headers: string[]) {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  sheet["!cols"] = headers.map((header) => ({
    wch: Math.min(42, Math.max(header.length * 2 + 2, ...rows.map((row) => String(row[header] ?? "").length + 2))),
  }));
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function totalPackage(offer: OfferRow) {
  return offer.baseMonthly * offer.salaryMonths + offer.annualBonus + offer.signOn + offer.stockAnnual + offer.allowanceAnnual;
}

export function createTrackerWorkbook(data: TrackerExportPayload, exportedAt = new Date()) {
  const workbook = XLSX.utils.book_new();
  const appById = new Map(data.applications.map((item) => [item.id, item]));
  const associatedJob = (applicationId: number | null) => {
    const item = applicationId ? appById.get(applicationId) : undefined;
    return item ? `${item.company} · ${item.role}` : "";
  };

  appendSheet(workbook, "导出说明", [{
    "导出时间": exportedAt.toLocaleString("zh-CN"),
    "投递记录": data.applications.length,
    "日程": data.interviews.length,
    "资料库": data.notes.length,
    "收藏池": data.prospects.length,
    "时间线": data.timeline.length,
    "Offer": data.offers.length,
    "附件": data.attachments.length,
  }], ["导出时间", "投递记录", "日程", "资料库", "收藏池", "时间线", "Offer", "附件"]);

  const applicationRows = data.applications.map((item) => ({
    "记录ID": item.id, "公司名称": item.company, "岗位名称": item.role, "城市": item.city, "行业": item.industry,
    "岗位类型": item.jobCategory, "团队": item.team, "薪资下限(K)": item.salaryMin, "薪资上限(K)": item.salaryMax,
    "工作类型": item.employmentType, "投递渠道": item.source, "投递日期": item.appliedDate, "截止日期": item.deadlineDate, "当前状态": item.stage,
    "优先级": item.priority, "岗位链接": item.applyUrl, "笔试时间": item.writtenDate, "一面时间": item.firstDate,
    "二面时间": item.secondDate, "下次节点": item.nextEventDate, "下一步行动": item.nextAction, "响应日期": item.responseDate,
    "结果": item.result, "JD原文": item.jdText, "备注": item.notes, "创建时间": item.createdAt, "更新时间": item.updatedAt,
  }));
  appendSheet(workbook, "投递记录", applicationRows, ["记录ID", "公司名称", "岗位名称", "城市", "行业", "岗位类型", "团队", "薪资下限(K)", "薪资上限(K)", "工作类型", "投递渠道", "投递日期", "截止日期", "当前状态", "优先级", "岗位链接", "笔试时间", "一面时间", "二面时间", "下次节点", "下一步行动", "响应日期", "结果", "JD原文", "备注", "创建时间", "更新时间"]);

  const interviewRows = data.interviews.map((item) => ({
    "日程ID": item.id, "关联投递ID": item.applicationId, "公司名称": item.company, "岗位名称": item.role, "环节": item.stage,
    "日期": item.date, "时间": item.time, "形式": item.format, "会议链接": item.link, "地址": item.address,
    "面试官": item.interviewer, "提醒时间": item.reminderAt, "注意事项": item.notice, "准备重点": item.prep,
    "结果与复盘": item.review, "创建时间": item.createdAt,
  }));
  appendSheet(workbook, "日程", interviewRows, ["日程ID", "关联投递ID", "公司名称", "岗位名称", "环节", "日期", "时间", "形式", "会议链接", "地址", "面试官", "提醒时间", "注意事项", "准备重点", "结果与复盘", "创建时间"]);

  const noteRows = data.notes.map((item) => ({
    "笔记ID": item.id, "关联岗位": associatedJob(item.applicationId), "分类": item.category, "标题": item.title,
    "正文": item.content, "标签": item.tags, "创建时间": item.createdAt, "更新时间": item.updatedAt,
  }));
  appendSheet(workbook, "资料库", noteRows, ["笔记ID", "关联岗位", "分类", "标题", "正文", "标签", "创建时间", "更新时间"]);

  appendSheet(workbook, "收藏池", data.prospects.map((item) => ({ "公司名称": item.company, "岗位名称": item.role })), ["公司名称", "岗位名称"]);

  const timelineRows = data.timeline.map((item) => ({
    "节点ID": item.id, "关联投递ID": item.applicationId, "关联岗位": associatedJob(item.applicationId), "类型": item.type,
    "事件": item.title, "发生时间": item.occurredAt, "备注": item.notes,
  }));
  appendSheet(workbook, "时间线", timelineRows, ["节点ID", "关联投递ID", "关联岗位", "类型", "事件", "发生时间", "备注"]);

  const offerRows = data.offers.map((item) => ({
    "Offer ID": item.id, "关联岗位": associatedJob(item.applicationId), "公司名称": item.company, "岗位名称": item.role,
    "城市": item.city, "月薪": item.baseMonthly, "薪资月数": item.salaryMonths, "年终奖": item.annualBonus,
    "签字费": item.signOn, "年度股票": item.stockAnnual, "年度补贴": item.allowanceAnnual, "估算年总包": totalPackage(item),
    "公积金比例(%)": item.housingFundRate, "工作强度评分": item.overtimeScore, "成长评分": item.growthScore,
    "个人意愿评分": item.preferenceScore, "备注": item.notes, "创建时间": item.createdAt,
  }));
  appendSheet(workbook, "Offer对比", offerRows, ["Offer ID", "关联岗位", "公司名称", "岗位名称", "城市", "月薪", "薪资月数", "年终奖", "签字费", "年度股票", "年度补贴", "估算年总包", "公积金比例(%)", "工作强度评分", "成长评分", "个人意愿评分", "备注", "创建时间"]);

  const attachmentRows = data.attachments.map((item) => ({
    "附件ID": item.id, "关联类型": item.entityType, "关联记录ID": item.entityId, "关联岗位": item.entityType === "application" ? associatedJob(item.entityId) : "",
    "文件名": item.filename, "文件类型": item.contentType, "文件大小(KB)": Math.ceil(item.size / 1024), "上传时间": item.createdAt,
  }));
  appendSheet(workbook, "附件清单", attachmentRows, ["附件ID", "关联类型", "关联记录ID", "关联岗位", "文件名", "文件类型", "文件大小(KB)", "上传时间"]);

  const settingRows = data.settings ? [{
    "目标投递数": data.settings.targetCount, "目标行业": data.settings.targetIndustries, "期望薪资": data.settings.salaryExpectation,
    "提醒开关": data.settings.reminderEnabled ? "开启" : "关闭", "默认提前小时": data.settings.reminderLeadHours,
    "自定义标签": data.settings.customTags,
  }] : [];
  appendSheet(workbook, "个人设置", settingRows, ["目标投递数", "目标行业", "期望薪资", "提醒开关", "默认提前小时", "自定义标签"]);

  return workbook;
}

export function downloadTrackerWorkbook(data: TrackerExportPayload, dateLabel: string) {
  XLSX.writeFile(createTrackerWorkbook(data), `LuLu秋招全部数据-${dateLabel}.xlsx`, { compression: true });
}
