import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { recruitmentFromText, recruitmentFromTable, recruitmentFromWorkbook, recruitmentKey, safeRecruitmentUrl, referralFromNotes, withReferral } from "../lib/recruitment-import.ts";

test("group messages preserve each company's URL and code; split explicit roles", () => {
  const rows = recruitmentFromText(`得物秋招内推链接：https://poizon.jobs.feishu.cn/s/_Example
内推码：NB62Z71
_________________
拼多多服务端开发/数据分析目前这两个hc很多也是急招的
内推链接：https://careers.pddglobalhr.com/campus/grad?t=w4RUtl9sza
推荐码：w4RUtl9sza

SHEIN秋招，近期新开，岗位很多
内推链接：https://app.mokahr.com/m/campus_apply/shein/2932?
recommendCode=DSHVDn9P#/jobs
内推码：DSHVDn9P`);
  assert.deepEqual(rows.map(({company, role, referralCode}) => [company, role, referralCode]), [
    ["得物", "", "NB62Z71"], ["拼多多", "服务端开发", "w4RUtl9sza"], ["拼多多", "数据分析", "w4RUtl9sza"], ["SHEIN", "", "DSHVDn9P"],
  ]);
  assert.equal(rows[3].url, "https://app.mokahr.com/m/campus_apply/shein/2932?recommendCode=DSHVDn9P#/jobs");
  assert.equal(rows[0].url, "https://poizon.jobs.feishu.cn/s/_Example");
});

test("labeled text retains URL and code without normalizing sensitive query characters", () => {
  const [row] = recruitmentFromText("公司：小米\n岗位：产品经理\n链接：https://example.com/jobs?code=AbC%2F12#roles\n内推码：AbC12");
  assert.equal(row.company, "小米"); assert.equal(row.role, "产品经理");
  assert.equal(row.url, "https://example.com/jobs?code=AbC%2F12#roles"); assert.equal(row.referralCode, "AbC12");
});

test("tables skip preamble and repeated headers; allow missing roles", () => {
  const rows = recruitmentFromTable([["秋招清单"], ["公司", "岗位/项目", "内推链接", "内推码"], ["示例", "产品经理", "https://example.com", "ABC"], ["另一家", "", "", ""], ["公司", "岗位/项目"], ["合计", 2]]);
  assert.equal(rows.length, 2); assert.equal(rows[0].referralCode, "ABC"); assert.equal(rows[1].role, "");
  assert.equal(recruitmentFromText('公司名称,岗位名称,岗位链接\n示例,"产品经理,运营",https://example.com')[0].role, "产品经理,运营");
});

test("same company different roles remain distinct; different referral options remain visible", () => {
  const rows = recruitmentFromTable([["公司", "岗位", "链接"], ["示例", "产品", "https://a.example"], ["示例", "产品", "https://a.example"], ["示例", "产品", "https://b.example"], ["示例", "运营", ""]]);
  assert.equal(rows.length, 3);
  assert.equal(recruitmentKey({company:" 示例 ",role:"产品"}), recruitmentKey(rows[0]));
  assert.notEqual(recruitmentKey(rows[0]), recruitmentKey(rows[2]));
  assert.equal(recruitmentKey({company:"示例",role:""}), recruitmentKey({company:"示例",role:"岗位待确认"}));
});

test("unknown company is reviewable and unsafe links are not clickable", () => {
  assert.equal(recruitmentFromText("https://example.com/jobs")[0].company, "");
  assert.equal(safeRecruitmentUrl("javascript:alert(1)"), "");
  assert.equal(safeRecruitmentUrl("https://user:pass@example.com"), "");
  assert.equal(safeRecruitmentUrl("https://example.com/?x=ABC#jobs"), "https://example.com/?x=ABC#jobs");
});

test("referral note storage supports editing while preserving remaining source", () => {
  const notes = withReferral("内推码：OLD\n公司：示例\n链接：https://example.com", "NEW");
  assert.equal(referralFromNotes(notes), "NEW");
  assert.equal(notes, "内推码：NEW\n公司：示例\n链接：https://example.com");
  assert.equal(withReferral(notes, ""), "公司：示例\n链接：https://example.com");
});

test("Excel hyperlink labels and shifted table origins preserve company and actual URLs", () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(sheet, [["公司名称", "岗位名称", "岗位链接", "内推码"], ["示例科技", "产品经理", "点击投递", "AbC"]], { origin: "C3" });
  sheet.E4.l = { Target: "https://example.com/jobs?code=AbC#roles" };
  XLSX.utils.book_append_sheet(workbook, sheet, "招聘清单");
  const sheet2 = XLSX.utils.aoa_to_sheet([["公司", "岗位"], ["另一家", "数据分析"]]);
  sheet2.A2.l = { Target: "https://example.org/careers" };
  XLSX.utils.book_append_sheet(workbook, sheet2, "第二批");
  const rows = recruitmentFromWorkbook(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].company, "示例科技"); assert.equal(rows[0].url, "https://example.com/jobs?code=AbC#roles");
  assert.equal(rows[1].company, "另一家"); assert.equal(rows[1].url, "https://example.org/careers");
});

test("numeric company names and email metadata are not corrupted into different companies", () => {
  const rows = recruitmentFromText("⭐360秋招\n内推链接：https://example.com\n咨询邮箱：jobs@example.com\n⭐腾讯音乐\n内推链接：https://example.org");
  assert.deepEqual(rows.map(row => row.company), ["360", "腾讯音乐"]);
  assert.equal(rows[0].url, "https://example.com");
});

test("exported favorites round-trip with codes and source notes", async () => {
  const { createTrackerWorkbook } = await import("../lib/export-workbook.ts");
  const workbook = createTrackerWorkbook({ applications: [], interviews: [], timeline: [], notes: [], prospects: [{ company: "示例", role: "岗位待确认", url: "https://example.com/?id=A#jobs", notes: "内推码：123ABC\n备注原文" }], attachments: [], offers: [], settings: null });
  const rows = recruitmentFromWorkbook(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));
  assert.equal(rows.length, 1); assert.equal(rows[0].company, "示例");
  assert.equal(rows[0].referralCode, "123ABC"); assert.equal(rows[0].notes, "内推码：123ABC\n备注原文");
});
