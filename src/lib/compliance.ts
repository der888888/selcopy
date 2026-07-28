import type { ComplianceIssue, GenerateResult } from "./types";

const RULES: {
  term: string;
  severity: "warn" | "high";
  suggestion: string;
  replace?: string;
}[] = [
  { term: "완치", severity: "high", suggestion: "효과·개선 등 완곡한 표현으로", replace: "개선에 도움" },
  { term: "치료", severity: "high", suggestion: "의료 효능 단정 표현 피하기", replace: "케어" },
  { term: "100%", severity: "high", suggestion: "절대 수치 단정 피하기", replace: "높은 만족도" },
  { term: "최고", severity: "warn", suggestion: "최상급 대신 구체적 근거", replace: "인기" },
  { term: "1위", severity: "warn", suggestion: "출처 없는 순위 표현 주의", replace: "많은 선택을 받은" },
  { term: "완벽", severity: "warn", suggestion: "완벽·절대 표현 완화", replace: "실용적인" },
  { term: "무조건", severity: "warn", suggestion: "단정 표현 완화", replace: "대체로" },
  { term: "기적", severity: "high", suggestion: "과장·허위 소지 표현 제거", replace: "만족스러운" },
  { term: "즉시 효과", severity: "high", suggestion: "즉효 단정 피하기", replace: "빠른 체감" },
  { term: "끝판왕", severity: "warn", suggestion: "과장 슬랭 완화", replace: "알찬 선택" },
  { term: "폭발", severity: "warn", suggestion: "과장 표현 완화", replace: "호평" },
];

function collectText(result: Pick<
  GenerateResult,
  "detailMarkdown" | "adCopies" | "titleCandidates" | "optionNames" | "searchKeywords"
>) {
  return [
    result.detailMarkdown,
    ...(result.titleCandidates || []),
    ...(result.adCopies || []),
    ...(result.optionNames || []),
    ...(result.searchKeywords || []),
  ].join("\n");
}

export function scanCompliance(
  result: Pick<
    GenerateResult,
    "detailMarkdown" | "adCopies" | "titleCandidates" | "optionNames" | "searchKeywords"
  >,
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const fields: { key: string; values: string[] }[] = [
    { key: "상세", values: [result.detailMarkdown] },
    { key: "상품명", values: result.titleCandidates || [] },
    { key: "광고", values: result.adCopies || [] },
    { key: "옵션", values: result.optionNames || [] },
    { key: "키워드", values: result.searchKeywords || [] },
  ];

  for (const rule of RULES) {
    const locations: string[] = [];
    for (const field of fields) {
      if (field.values.some((v) => v.includes(rule.term))) {
        locations.push(field.key);
      }
    }
    if (locations.length) {
      issues.push({
        term: rule.term,
        severity: rule.severity,
        suggestion: rule.suggestion,
        locations: [...new Set(locations)],
      });
    }
  }

  // unused but keeps collectText available for future
  void collectText;
  return issues;
}

function softenText(text: string) {
  let next = text;
  for (const rule of RULES) {
    if (rule.replace) {
      next = next.split(rule.term).join(rule.replace);
    }
  }
  return next;
}

export function applyComplianceSoftening(result: GenerateResult): GenerateResult {
  const softened: GenerateResult = {
    ...result,
    detailMarkdown: softenText(result.detailMarkdown),
    detailHtml: softenText(result.detailHtml),
    titleCandidates: (result.titleCandidates || []).map(softenText),
    adCopies: (result.adCopies || []).map(softenText),
    optionNames: (result.optionNames || []).map(softenText),
    searchKeywords: (result.searchKeywords || []).map(softenText),
    compliance: [],
  };
  softened.compliance = scanCompliance(softened);
  return softened;
}

export function attachCompliance(result: GenerateResult): GenerateResult {
  return {
    ...result,
    compliance: scanCompliance(result),
  };
}
