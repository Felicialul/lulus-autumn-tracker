import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("declares the LuLu tracker metadata and explicit loading state", async () => {
  const [layout, page] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /LuLu‘s 秋招投递管家/);
  assert.match(page, /正在加载数据/);
  assert.match(page, /最长等待 9 秒/);
});

test("implements bounded sync, local fallback, and action-first mobile UX", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /setTimeout\(\(\)=>controller\.abort\(\),9000\)/);
  assert.match(page, /使用本地数据/);
  assert.match(page, /数据同步失败/);
  assert.match(page, /今日行动/);
  assert.match(page, /本周投递进度/);
  assert.match(page, /求职漏斗/);
  assert.match(page, /标记已投/);
  assert.match(css, /\.mobile-bottom-nav/);
  assert.match(css, /\.quick-add/);
});

test("imports applications in one batch and reports skipped duplicates", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/applications/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /JSON\.stringify\(\{items:candidates\}\)/);
  assert.match(page, /跳过 \$\{skipped\} 条重复或空记录/);
  assert.match(route, /const known = new Set\(current\.map\(applicationIdentity\)\)/);
  assert.match(route, /known\.has\(key\)/);
  assert.match(route, /known\.add\(key\)/);
});

test("uses Microsoft YaHei across the site and exposes a complete Excel export", async () => {
  const [page, css, exporter] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../lib/export-workbook.ts", import.meta.url), "utf8"),
  ]);
  assert.match(css, /font-family:"Microsoft YaHei","微软雅黑"/);
  assert.match(css, /sidebar nav button\{min-height:48px[^}]+font-size:17px/);
  assert.match(page, /导出全部 Excel/);
  assert.match(page, /downloadTrackerWorkbook\(data,todayYmd\(\)\)/);
  for (const sheet of ["投递记录", "日程", "资料库", "收藏池", "时间线", "Offer对比", "附件清单", "个人设置"]) {
    assert.match(exporter, new RegExp(`"${sheet}"`));
  }
});

test("uses Microsoft YaHei and larger typography for applications and navigation", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /page applications-page/);
  assert.match(css, /font-family:"Microsoft YaHei","微软雅黑"/);
  assert.match(css, /\.sidebar nav button\{min-height:48px[^}]*font-size:17px/);
  assert.match(css, /table\{font-size:14px\}/);
  assert.match(css, /\.company-cell strong\{font-size:16px\}/);
});
