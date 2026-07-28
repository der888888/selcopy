import OpenAI from "openai";
import type { GenerateInput, GenerateResult } from "./types";
import { hasOpenAI } from "./env";

function buildPrompt(input: GenerateInput, limited: boolean) {
  const limitNote = limited
    ? "무료 체험용으로 상세는 짧게(400자 이내), 광고문구 5개만, 키워드 8개만 작성하세요."
    : "상세는 판매 가능한 분량으로, 광고문구 10개, 옵션명 8개, 검색 키워드 15개를 작성하세요.";

  return `
당신은 한국 이커머스(스마트스토어/쿠팡) 상세페이지·광고 카피라이터입니다.
플랫폼: ${input.platform === "coupang" ? "쿠팡" : "스마트스토어"}
상품명: ${input.productName}
카테고리: ${input.category || "미지정"}
핵심 키워드: ${input.keywords || "없음"}
판매 포인트: ${input.sellingPoints || "없음"}
이미지/비주얼 메모: ${input.imageNote || "없음"}
브랜드톤: ${input.brandTone || "신뢰감 있고 구체적인 톤"}
${limitNote}

반드시 아래 JSON만 출력하세요. 마크다운 코드블록 금지.
{
  "detailMarkdown": "마크다운 상세 본문",
  "detailHtml": "간단한 HTML 상세 본문",
  "adCopies": ["광고문구"],
  "optionNames": ["옵션명"],
  "searchKeywords": ["검색키워드"]
}
`.trim();
}

function mockGenerate(input: GenerateInput, limited: boolean): GenerateResult {
  const ads = [
    `${input.productName} — 지금 바로 확인하세요`,
    `${input.category || "인기"} 필수템, ${input.productName}`,
    `구매 전 꼭 보세요. ${input.productName}`,
    `가성비 끝판왕 ${input.productName}`,
    `${input.sellingPoints?.split(/[,\n]/)[0]?.trim() || "핵심 장점"} 살린 ${input.productName}`,
    `재구매율 높은 ${input.productName}`,
    `오늘만 주목! ${input.productName}`,
    `리뷰 폭발 예정 ${input.productName}`,
    `선물용으로도 좋은 ${input.productName}`,
    `검색 1위 노리는 ${input.productName}`,
  ];

  const detailMarkdown = [
    `# ${input.productName}`,
    "",
    `## 한줄 소개`,
    `${input.sellingPoints || "일상에 바로 쓰는 실용 아이템"}`,
    "",
    `## 이런 분께 추천`,
    `- ${input.category || "관련"} 상품을 찾는 분`,
    `- ${input.keywords || "가성비"}를 중요하게 보는 분`,
    "",
    `## 핵심 포인트`,
    `1. ${input.sellingPoints || "품질과 실용성의 균형"}`,
    `2. ${input.platform === "coupang" ? "로켓배송에 최적화된 구성" : "스마트스토어 검색 노출을 고려한 구성"}`,
    `3. 선물·재구매에도 부담 없는 선택`,
    "",
    `## 사용 장면`,
    `집 / 사무실 / 여행 어디서든 ${input.productName}의 장점을 바로 체감할 수 있습니다.`,
    "",
    limited ? `\n---\n*셀카피 무료 체험 초안*` : "",
  ].join("\n");

  const detailHtml = detailMarkdown
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br/>");

  return {
    detailMarkdown,
    detailHtml,
    adCopies: limited ? ads.slice(0, 5) : ads,
    optionNames: [
      "기본",
      "대용량",
      "선물세트",
      "1+1",
      "컬러A",
      "컬러B",
      "프리미엄",
      "체험팩",
    ].slice(0, limited ? 4 : 8),
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
      "오늘출발",
    ]
      .filter(Boolean)
      .slice(0, limited ? 8 : 15),
    watermarked: limited,
  };
}

export async function generateCopy(
  input: GenerateInput,
  options?: { limited?: boolean },
): Promise<GenerateResult> {
  const limited = options?.limited ?? false;

  if (!hasOpenAI()) {
    return mockGenerate(input, limited);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "당신은 한국어 이커머스 카피 전문가입니다. JSON만 반환합니다.",
      },
      { role: "user", content: buildPrompt(input, limited) },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<GenerateResult>;

  return {
    detailMarkdown: parsed.detailMarkdown || mockGenerate(input, limited).detailMarkdown,
    detailHtml: parsed.detailHtml || mockGenerate(input, limited).detailHtml,
    adCopies: (parsed.adCopies || []).slice(0, limited ? 5 : 10),
    optionNames: (parsed.optionNames || []).slice(0, limited ? 4 : 8),
    searchKeywords: (parsed.searchKeywords || []).slice(0, limited ? 8 : 15),
    watermarked: limited,
  };
}
