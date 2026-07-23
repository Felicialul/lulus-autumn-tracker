export type CompanyRole = { company: string; role: string };

const COMPANY_LABELS = new Set(["公司", "公司名", "公司名称", "企业", "企业名称"]);
const ROLE_LABELS = new Set([
  "岗位", "岗位名", "岗位名称", "职位", "职位名称",
  "岗位/项目", "岗位／项目", "岗位项目", "项目/岗位", "项目／岗位",
  "职位/项目", "职位／项目",
]);

function cleanValue(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

export function normalizedRecordPart(value: unknown) {
  return cleanValue(value).replace(/\s+/g, "").toLocaleLowerCase("zh-CN");
}

export function applicationIdentity(value: { company?: unknown; role?: unknown }) {
  return `${normalizedRecordPart(value.company)}\u0000${normalizedRecordPart(value.role)}`;
}

export function uniqueCompanyRoles<T extends CompanyRole>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const company = cleanValue(item.company);
    const role = cleanValue(item.role);
    const key = applicationIdentity({ company, role });
    if (!company || !role || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeCompanyRole(value: Partial<CompanyRole>): CompanyRole {
  return { company: cleanValue(value.company), role: cleanValue(value.role) };
}

function cleanHeader(value: unknown) {
  return cleanValue(value).replace(/\s+/g, "");
}

export function companyRolesFromTable(rows: unknown[][]) {
  const useful = rows
    .map((row) => row.map(cleanValue))
    .filter((row) => row.some(Boolean));
  const headerIndex = useful.findIndex(
    (row) => row.some((cell) => COMPANY_LABELS.has(cleanHeader(cell)))
      && row.some((cell) => ROLE_LABELS.has(cleanHeader(cell))),
  );
  if (headerIndex < 0) return [];
  const companyIndex = useful[headerIndex].findIndex((cell) => COMPANY_LABELS.has(cleanHeader(cell)));
  const roleIndex = useful[headerIndex].findIndex((cell) => ROLE_LABELS.has(cleanHeader(cell)));
  return uniqueCompanyRoles(
    useful.slice(headerIndex + 1).map((row) => normalizeCompanyRole({
      company: row[companyIndex],
      role: row[roleIndex],
    })),
  );
}

export function selectBestCompanyRoleRows(sheets: { name: string; rows: unknown[][] }[]) {
  let best: { rows: unknown[][]; score: number } | null = null;
  for (const sheet of sheets) {
    const records = companyRolesFromTable(sheet.rows);
    if (!records.length) continue;
    const preferred = /投递清单|投递记录|岗位清单|职位清单|收藏池|收藏夹/u.test(sheet.name);
    const summary = /概览|汇总|时间线|索引|说明/u.test(sheet.name);
    const score = records.length + (preferred ? 10000 : 0) - (summary ? 1000 : 0);
    if (!best || score > best.score) best = { rows: sheet.rows, score };
  }
  return best?.rows || [];
}

function parseLabeledText(source: string) {
  const rows: CompanyRole[] = [];
  let current: Partial<CompanyRole> = {};

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      if (current.company && current.role) rows.push(normalizeCompanyRole(current));
      current = {};
      continue;
    }

    const match = line.match(/^(公司名称|公司名|公司|企业名称|企业|岗位名称|岗位名|岗位|职位名称|职位)\s*[：:]\s*(.+)$/u);
    if (!match) continue;
    const label = match[1].replace(/\s+/g, "");
    if (COMPANY_LABELS.has(label)) {
      if (current.company && current.role) rows.push(normalizeCompanyRole(current));
      current = { company: match[2] };
    } else if (ROLE_LABELS.has(label)) {
      current.role = match[2];
    }
  }

  if (current.company && current.role) rows.push(normalizeCompanyRole(current));
  return uniqueCompanyRoles(rows);
}

function parseDelimitedText(source: string) {
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const separator = lines[0]?.includes("\t") ? "\t" : lines[0]?.includes("｜") ? "｜" : lines[0]?.includes("|") ? "|" : lines[0]?.includes(",") ? "," : "";
  if (!separator) return [];

  const table = lines.map((line) => line.split(separator).map(cleanValue));
  const headerIndex = table.findIndex((row) => row.some((cell) => COMPANY_LABELS.has(cleanHeader(cell))) && row.some((cell) => ROLE_LABELS.has(cleanHeader(cell))));
  if (headerIndex >= 0) {
    const companyIndex = table[headerIndex].findIndex((cell) => COMPANY_LABELS.has(cleanHeader(cell)));
    const roleIndex = table[headerIndex].findIndex((cell) => ROLE_LABELS.has(cleanHeader(cell)));
    return uniqueCompanyRoles(table.slice(headerIndex + 1).map((row) => normalizeCompanyRole({ company: row[companyIndex], role: row[roleIndex] })));
  }

  return uniqueCompanyRoles(table.map((row) => normalizeCompanyRole({ company: row[0], role: row[1] })));
}

function isRecruitmentHeading(line: string) {
  return /^(?:[-*•]\s*)?(?:\p{Extended_Pictographic}|[★☆⭐✨✅☑✔📌📣🔥🏢💼])/u.test(line);
}

function stripHeadingMarker(line: string) {
  return line
    .replace(/^(?:[-*•]\s*)?(?:(?:\p{Extended_Pictographic}|[★☆⭐✨✅☑✔📌📣🔥🏢💼])\uFE0F?\s*)+/u, "")
    .replace(/^#{1,6}\s*/, "")
    .trim();
}

function parseRecruitmentHeading(heading: string): CompanyRole | null {
  if (!heading || heading.length > 100) return null;
  if (/(?:https?:\/\/|www\.|@|合集|汇总|清单|名单|网申(?:地址)?|投递(?:地址|链接)?|报名|咨询|邮箱|内推码|详情|福利|亮点|要求)/iu.test(heading)) return null;

  const bracketParts = Array.from(heading.matchAll(/[【[]([^】\]]+)[】\]]/gu), (match) => cleanValue(match[1])).filter(Boolean);
  if (bracketParts.length >= 2 && !/^(?:校园招聘|校招|招聘|内推)$/u.test(bracketParts[0])) {
    return normalizeCompanyRole({ company: bracketParts[0], role: bracketParts.slice(1).join(" ") });
  }

  const separated = heading
    .split(/\s*(?:[｜|丨]|—+|–+|－+|\s+-\s+|[：:])\s*/u)
    .map((value) => value.replace(/^[【[]|[】\]]$/g, "").trim())
    .filter(Boolean);
  if (separated.length >= 2) return normalizeCompanyRole({ company: separated[0], role: separated.slice(1).join(" ") });

  const spaced = heading.match(/^(.{2,24}?)\s+(.{2,70})$/u);
  if (spaced) return normalizeCompanyRole({ company: spaced[1], role: spaced[2] });

  // 常见公众号写法："百度AIDU计划"、"腾讯TAPD招聘"。
  const chineseThenLatinRole = heading.match(/^([\p{Script=Han}]{2,16}?)([A-Za-z][A-Za-z0-9+&._/-]*(?:计划|项目|岗位|招聘|校招)?)$/u);
  if (chineseThenLatinRole) return normalizeCompanyRole({ company: chineseThenLatinRole[1], role: chineseThenLatinRole[2] });

  // 只有公司名时仍保留为结构化记录，岗位用明确占位，方便导入前手动修改。
  if (/^[\p{Script=Han}A-Za-z0-9+&._（）()·-]{2,30}$/u.test(heading)) {
    return normalizeCompanyRole({ company: heading, role: "校招岗位" });
  }
  return null;
}

function parseRecruitmentPost(source: string) {
  const rows: CompanyRole[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!isRecruitmentHeading(line)) continue;
    const row = parseRecruitmentHeading(stripHeadingMarker(line));
    if (row) rows.push(row);
  }
  return uniqueCompanyRoles(rows);
}

export function prospectsFromText(text: string) {
  const source = cleanValue(text);
  if (!source) return [];
  const labeled = parseLabeledText(source);
  if (labeled.length) return labeled;
  const delimited = parseDelimitedText(source);
  if (delimited.length) return delimited;
  return parseRecruitmentPost(source);
}
