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
