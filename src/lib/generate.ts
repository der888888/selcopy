import OpenAI from "openai";
import type { GenerateInput, GenerateMode, GenerateResult } from "./types";
import { hasOpenAI } from "./env";
import { getPlatformTemplate } from "./platforms";
import { applyComplianceSoftening, attachCompliance } from "./compliance";

function counts(limited: boolean) {
  return limited
    ? { titles: 3, ads: 5, options: 4, keywords: 8 }
    : { titles: 8, ads: 10, options: 8, keywords: 15 };
}

function buildFullPrompt(input: GenerateInput, limited: boolean) {
  const tpl = getPlatformTemplate(input.platform);
  const c = counts(limited);
  const limitNote = limited
    ? "무료 체험용으로 상세는 짧게(400자 이내) 작성하세요."
    : "상세는 판매 가능한 분량으로 작성하세요.";

  return `
당신은 한국 이커머스 ${tpl.label} 전용 카피라이터입니다.
플랫폼 규칙:
- 상품명 최대 약 ${tpl.titleMaxLen}자
- 광고 문구 최대 약 ${tpl.adMaxLen}자
- 상세 섹션: ${tpl.detailSections.join(" / ")}
- 톤: ${tpl.toneHints.join("; ")}
- 추가: ${tpl.extraRules.join("; ")}

상품명(원본): ${input.productName}
카테고리: ${input.category || "미지정"}
핵심 키워드: ${input.keywords || "없음"}
판매 포인트: ${input.sellingPoints || "없음"}
이미지/비주얼 메모: ${input.imageNote || "없음"}
브랜드톤: ${input.brandTone || "신뢰감 있고 구체적인 톤"}
${limitNote}

금지: 완치/치료/100%/기적/즉시 효과 등 과장·의료 단정 표현.

반드시 아래 JSON만 출력. 코드블록 금지.
{
  "detailMarkdown": "마크다운 상세",
  "detailHtml": "간단 HTML 상세",
  "titleCandidates": ["상품명 후보 ${c.titles}개"],
  "adCopies": ["광고문구 ${c.ads}개"],
  "optionNames": ["옵션명 ${c.options}개"],
  "searchKeywords": ["검색키워드 ${c.keywords}개"]
}
`.trim();
}

function buildPartialPrompt(input: GenerateInput, limited: boolean) {
  const tpl = getPlatformTemplate(input.platform);
  const c = counts(limited);
  return `
${tpl.label}용으로 광고 문구와 검색 키워드만 다시 작성하세요.
상품명: ${input.productName}
카테고리: ${input.category || "미지정"}
핵심 키워드: ${input.keywords || "없음"}
판매 포인트: ${input.sellingPoints || "없음"}
브랜드톤: ${input.brandTone || "신뢰감 있고 구체적"}
광고 최대 약 ${tpl.adMaxLen}자, ${c.ads}개.
검색 키워드 ${c.keywords}개.
과장·의료 단정 표현 금지.
JSON만 출력:
{ "adCopies": [], "searchKeywords": [] }
`.trim();
}

function mockFull(input: GenerateInput, limited: boolean): GenerateResult {
  const tpl = getPlatformTemplate(input.platform);
  const c = counts(limited);
  const point = input.sellingPoints?.split(/[,\n]/)[0]?.trim() || "핵심 장점";

  const titleCandidates = [
    `${input.productName} ${point}`.slice(0, tpl.titleMaxLen),
    `${input.category || ""} ${input.productName}`.trim().slice(0, tpl.titleMaxLen),
    `${input.productName} 추천`.slice(0, tpl.titleMaxLen),
    `실용 ${input.productName}`.slice(0, tpl.titleMaxLen),
    `${input.keywords?.split(/[,\s]/)[0] || ""} ${input.productName}`.trim().slice(0, tpl.titleMaxLen),
    `데일리 ${input.productName}`.slice(0, tpl.titleMaxLen),
    `선물용 ${input.productName}`.slice(0, tpl.titleMaxLen),
    `${input.productName} ${input.platform === "coupang" ? "빠른배송" : "검색최적화"}`.slice(
      0,
      tpl.titleMaxLen,
    ),
  ]
    .filter(Boolean)
    .slice(0, c.titles);

  const ads = [
    `${input.productName} — 지금 확인해보세요`,
    `${input.category || "인기"} 추천, ${input.productName}`,
    `구매 전 꼭 보세요. ${input.productName}`,
    `알찬 선택 ${input.productName}`,
    `${point} 살린 ${input.productName}`,
    `재구매 많은 ${input.productName}`,
    `오늘 주목! ${input.productName}`,
    `호평 이어지는 ${input.productName}`,
    `선물용으로도 좋은 ${input.productName}`,
    `검색에도 잘 걸리는 ${input.productName}`,
  ].slice(0, c.ads);

  const sections = tpl.detailSections
    .map((s) => {
      if (s.includes("한줄")) return `## ${s}\n${input.sellingPoints || "일상에 바로 쓰는 실용 아이템"}`;
      if (s.includes("추천") || s.includes("왜"))
        return `## ${s}\n- ${input.category || "관련"} 상품을 찾는 분\n- ${input.keywords || "가성비"}를 보는 분`;
      if (s.includes("포인트"))
        return `## ${s}\n1. ${point}\n2. ${tpl.toneHints[0]}\n3. 선물·재구매에도 부담 적은 구성`;
      if (s.includes("구성") || s.includes("스펙"))
        return `## ${s}\n- 구성: 본품\n- 포인트: ${point}`;
      if (s.includes("배송"))
        return `## ${s}\n빠른 수령을 원하는 분께 맞춰 포장·안내를 단순화했습니다.`;
      if (s.includes("안내") || s.includes("묻는"))
        return `## ${s}\n실측/색감은 모니터에 따라 다를 수 있습니다.`;
      return `## ${s}\n집·사무실·여행에서도 ${input.productName}의 장점을 바로 체감할 수 있습니다.`;
    })
    .join("\n\n");

  const detailMarkdown = [
    `# ${input.productName}`,
    "",
    `> ${tpl.label} 템플릿 초안`,
    "",
    sections,
    limited ? `\n---\n*셀카피 무료 체험 초안*` : "",
  ].join("\n");

  const detailHtml = detailMarkdown
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^> (.*)$/gm, "<p><em>$1</em></p>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br/>");

  return attachCompliance({
    detailMarkdown,
    detailHtml,
    titleCandidates,
    adCopies: ads,
    optionNames: [
      "기본",
      "대용량",
      "선물세트",
      "1+1",
      "컬러A",
      "컬러B",
      "프리미엄",
      "체험팩",
    ].slice(0, c.options),
    searchKeywords: [
      input.productName,
      ...(input.keywords || "")
        .split(/[,\s]+/)
        .map((k) => k.trim())
        .filter(Boolean),
      `${input.category} 추천`,
      `${input.category} 인기`,
      "가성비",
      "선물추천",
      "집들이선물",
      "생활용품",
      input.platform === "coupang" ? "로켓배송" : "오늘출발",
    ]
      .filter(Boolean)
      .slice(0, c.keywords),
    compliance: [],
    watermarked: limited,
  });
}

function mockPartial(input: GenerateInput, limited: boolean) {
  const full = mockFull(input, limited);
  return {
    adCopies: full.adCopies,
    searchKeywords: full.searchKeywords,
  };
}

export async function generateCopy(
  input: GenerateInput,
  options?: { limited?: boolean; mode?: GenerateMode },
): Promise<GenerateResult> {
  const limited = options?.limited ?? false;
  const mode = options?.mode ?? "full";
  const c = counts(limited);

  if (!hasOpenAI()) {
    const base = mockFull(input, limited);
    return applyComplianceSoftening(base);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (mode === "ads_keywords") {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "한국어 이커머스 광고/키워드 전문가. JSON만 반환.",
        },
        { role: "user", content: buildPartialPrompt(input, limited) },
      ],
    });
    const parsed = JSON.parse(
      completion.choices[0]?.message?.content ?? "{}",
    ) as Partial<GenerateResult>;
    const mock = mockPartial(input, limited);
    // partial caller merges into existing result
    return attachCompliance({
      detailMarkdown: "",
      detailHtml: "",
      titleCandidates: [],
      optionNames: [],
      adCopies: (parsed.adCopies || mock.adCopies).slice(0, c.ads),
      searchKeywords: (parsed.searchKeywords || mock.searchKeywords).slice(
        0,
        c.keywords,
      ),
      compliance: [],
      watermarked: limited,
    });
  }

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "한국어 이커머스 카피 전문가. JSON만 반환.",
      },
      { role: "user", content: buildFullPrompt(input, limited) },
    ],
  });

  const parsed = JSON.parse(
    completion.choices[0]?.message?.content ?? "{}",
  ) as Partial<GenerateResult>;
  const fallback = mockFull(input, limited);

  const result: GenerateResult = {
    detailMarkdown: parsed.detailMarkdown || fallback.detailMarkdown,
    detailHtml: parsed.detailHtml || fallback.detailHtml,
    titleCandidates: (parsed.titleCandidates || fallback.titleCandidates).slice(
      0,
      c.titles,
    ),
    adCopies: (parsed.adCopies || fallback.adCopies).slice(0, c.ads),
    optionNames: (parsed.optionNames || fallback.optionNames).slice(0, c.options),
    searchKeywords: (parsed.searchKeywords || fallback.searchKeywords).slice(
      0,
      c.keywords,
    ),
    compliance: [],
    watermarked: limited,
  };

  return applyComplianceSoftening(attachCompliance(result));
}
