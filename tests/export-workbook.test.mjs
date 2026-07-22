import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";

import { createTrackerWorkbook } from "../lib/export-workbook.ts";

test("exports every tracker module to a separate Excel worksheet", () => {
  const application = {
    id: 1, company: "百度", role: "产品经理", city: "北京", industry: "互联网", jobCategory: "产品", team: "",
    salaryMin: 20, salaryMax: 30, employmentType: "全职", appliedDate: "2026-07-22", deadlineDate: "",
    stage: "已投递", priority: "A", applyUrl: "https://example.com", writtenDate: "", firstDate: "", secondDate: "",
    nextEventDate: "", nextAction: "跟进", responseDate: "", result: "待定", jdText: "JD", notes: "备注",
    createdAt: "2026-07-22", updatedAt: "2026-07-22",
  };
  const workbook = createTrackerWorkbook({
    applications: [application],
    interviews: [], timeline: [], notes: [],
    prospects: [{ company: "腾讯音乐", role: "校招岗位" }],
    attachments: [], offers: [],
    settings: { targetCount: 80, targetIndustries: "互联网", salaryExpectation: "20-30K", reminderEnabled: true, reminderLeadHours: 24, customTags: "Dream" },
  }, new Date("2026-07-22T08:00:00Z"));

  assert.deepEqual(workbook.SheetNames, ["导出说明", "投递记录", "日程", "资料库", "收藏池", "时间线", "Offer对比", "附件清单", "个人设置"]);
  const applicationRows = XLSX.utils.sheet_to_json(workbook.Sheets["投递记录"]);
  const prospectRows = XLSX.utils.sheet_to_json(workbook.Sheets["收藏池"]);
  assert.equal(applicationRows[0]["公司名称"], "百度");
  assert.deepEqual(prospectRows[0], { "公司名称": "腾讯音乐", "岗位名称": "校招岗位" });
});
