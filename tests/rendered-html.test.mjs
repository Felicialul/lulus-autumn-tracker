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

test("offers a confirmed delete action on every application row", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /className="application-row-actions"/);
  assert.match(page, /className="row-delete"/);
  assert.match(page, /deleteItem\(`\/api\/applications\?id=\$\{item\.id\}`/);
  assert.match(css, /\.row-delete\{/);
});

test("opens valid application links in a safe new tab from the list and detail view", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /function externalJobUrl/);
  assert.match(page, /\["http:","https:"\]\.includes\(url\.protocol\)/);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
  assert.match(page, /<JobLink url=\{item\.applyUrl\} compact\/>/);
  assert.match(page, /<JobLink url=\{app\.applyUrl\}\/>/);
  assert.match(css, /\.job-link\{/);
});

test("tracks and compares application channels", async () => {
  const [page, route, exporter] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/applications/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/export-workbook.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Field label="投递渠道"/);
  assert.match(page, /投递渠道效果/);
  assert.match(page, /平均响应/);
  assert.match(page, /"投递渠道":"source"/);
  assert.match(route, /"source"/);
  assert.match(exporter, /"投递渠道": item\.source/);
});

test("supports AI interviews across status, scheduling, funnel, and styling", async () => {
  const [page, route, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/applications/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /"笔试","AI 面试","一面"/);
  assert.match(page, /"笔试","AI 面试","群面"/);
  assert.match(page, /\{label:"AI 面试",count:/);
  assert.match(route, /"笔试","AI 面试","一面"/);
  assert.match(css, /\.pill-AI-面试/);
});

test("searches applications by company and role with multiple keywords", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /function applicationMatchesSearch/);
  assert.match(page, /terms\.every\(term=>searchable\.includes\(term\)\)/);
  assert.match(page, /按公司名称或岗位名称搜索投递记录/);
  assert.match(page, /找到 \$\{filteredApps\.length\} 条匹配记录/);
  assert.match(page, /aria-label="清空搜索"/);
});

test("provides a reference-inspired global search interaction", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /className="global-search"/);
  assert.match(page, /aria-label="全局搜索公司或岗位"/);
  assert.match(page, /event\.key==="\/"/);
  assert.match(page, /if\(e\.key==="Enter"\)setPage\("applications"\)/);
});

test("uses the supplied good-things collage as a clear responsive wallpaper", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /background-image:url\("\/background-good-things\.png"\)/);
  assert.match(css, /background-attachment:fixed/);
  assert.match(css, /\.app-shell\{background-color:transparent;background-image:url/);
  assert.match(css, /background:rgb\(255 255 255 \/ 62%\)/);
});

test("ships a public edition with isolated browser storage and no private repository connection", async () => {
  const [entry, html, store, config] = await Promise.all([
    readFile(new URL("../community/main.tsx", import.meta.url), "utf8"),
    readFile(new URL("../community/index.html", import.meta.url), "utf8"),
    readFile(new URL("../lib/github-data-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../vite.public.config.ts", import.meta.url), "utf8"),
  ]);
  assert.match(entry, /__LULU_LOCAL_DATA__ = true/);
  assert.match(entry, /delete window\.__LULU_GITHUB_DATA__/);
  assert.doesNotMatch(entry, /lulus-autumn-data/);
  assert.match(html, /秋招投递管家｜公用版/);
  assert.match(store, /career-tracker-public-data-v1/);
  assert.match(store, /career-tracker-public-cache-v1/);
  assert.match(config, /base: "\/career-tracker\/"/);
});

test("supports private-only bulk actions in the prospect pool", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /selectedProspectIds/);
  assert.match(page, /function bulkConvertProspects/);
  assert.match(page, /function bulkDeleteProspects/);
  assert.match(page, /!localMode&&data\.prospects\.length>0/);
  assert.match(page, /全选当前收藏/);
  assert.match(page, /已选 \{selectedProspectIds\.length\} 条/);
  assert.match(page, /批量去投递/);
  assert.match(page, /批量删除/);
  assert.match(page, /转入“待投递”/);
  assert.match(css, /\.prospect-bulk-toolbar\{/);
  assert.match(css, /\.prospect-card\.selected\{/);
});

test("groups filtered and sorted applications by exact company identity", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /companyId\?:number\|string\|null/);
  assert.match(page, /companyId\?`id:\$\{companyId\}`:`name:\$\{item\.company\.trim\(\)\}`/);
  assert.match(page, /groupApplicationsByCompany\(filteredApps\)/);
  assert.match(page, /useState<ApplicationViewMode>\("company"\)/);
  assert.match(page, /按公司/);
  assert.match(page, /按岗位/);
  assert.match(page, /aria-expanded=\{expanded\}/);
  assert.match(page, /group\.applications\.length\} 个岗位/);
  assert.match(page, /ApplicationTable applications=\{group\.applications\}/);
  assert.match(css, /\.company-group-card\{/);
  assert.match(css, /\.application-view-switch\{/);
  assert.match(css, /@media\(max-width:760px\)\{\.applications-page \.page-head/);
});

test("keeps application tables horizontally scrollable in compact desktop windows", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /className="table-card application-table" tabIndex=\{0\}/);
  assert.match(page, /岗位列表，可横向滚动查看完整内容/);
  assert.match(page, /横向滑动查看完整内容/);
  assert.match(css, /\.application-table\{[^}]*overflow-x:auto!important/);
  assert.match(css, /scrollbar-gutter:stable/);
  assert.match(css, /touch-action:pan-x pan-y/);
  assert.match(css, /\.company-group-card\{min-width:0/);
  assert.match(css, /@media\(min-width:761px\) and \(max-width:1180px\)/);
  assert.match(css, /@media\(max-width:760px\).*\.application-table\{overflow:visible!important/);
});
