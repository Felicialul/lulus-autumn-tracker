import assert from "node:assert/strict";
import test from "node:test";

import {
  applicationIdentity,
  prospectsFromText,
  uniqueCompanyRoles,
} from "../lib/import-utils.ts";

test("recognizes company and role headings inside a recruitment post", () => {
  const text = `🔔人才计划合集（二）
⭐百度AIDU计划
网申地址：https://dwz.cn/WScY8Ybs
内推码：IZS1RK
【校园招聘】—【AIDU计划】，找到心仪的职位方向一键投递
👂AIDU计划专属咨询邮箱：aidu@baidu.com

⭐腾讯音乐
投递链接：https://join.tencentmusic.com/campus/post?type=40`;

  assert.deepEqual(prospectsFromText(text), [
    { company: "百度", role: "AIDU计划" },
    { company: "腾讯音乐", role: "校招岗位" },
  ]);
});

test("recognizes labeled and tabular pasted text", () => {
  assert.deepEqual(prospectsFromText("公司：小米\n岗位：产品经理"), [
    { company: "小米", role: "产品经理" },
  ]);
  assert.deepEqual(prospectsFromText("公司名\t岗位名\n字节跳动\t产品经理"), [
    { company: "字节跳动", role: "产品经理" },
  ]);
});

test("uses the same normalized company-role identity for duplicate filtering", () => {
  assert.equal(
    applicationIdentity({ company: " 拼 多 多 ", role: "产品管培生" }),
    applicationIdentity({ company: "拼多多", role: " 产品管培生 " }),
  );
  assert.deepEqual(
    uniqueCompanyRoles([
      { company: "拼多多", role: "产品管培生" },
      { company: " 拼 多 多 ", role: "产品管培生" },
      { company: "宝马", role: "管培生" },
    ]),
    [
      { company: "拼多多", role: "产品管培生" },
      { company: "宝马", role: "管培生" },
    ],
  );
});
