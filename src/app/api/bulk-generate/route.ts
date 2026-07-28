import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeAndSaveGeneration, getCurrentProfile } from "@/lib/auth";
import { generateCopy } from "@/lib/generate";
import { decideConsume } from "@/lib/credits";
import { isPaidPlan } from "@/lib/plans";
import type { Platform } from "@/lib/types";

const rowSchema = z.object({
  productName: z.string().min(1).max(120),
  category: z.string().max(80).optional().default(""),
  keywords: z.string().max(200).optional().default(""),
  sellingPoints: z.string().max(1000).optional().default(""),
  platform: z.enum(["smartstore", "coupang"]).optional().default("smartstore"),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(100),
});

function escapeCsv(value: string) {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    if (!isPaidPlan(profile.plan)) {
      return NextResponse.json(
        {
          error: "CSV 대량 생성은 스타터 이상 구독 기능입니다.",
          code: "SUBSCRIPTION_REQUIRED",
        },
        { status: 403 },
      );
    }

    const { rows } = bodySchema.parse(await request.json());
    const outputs: {
      productName: string;
      platform: Platform;
      titleCandidates: string;
      adCopies: string;
      optionNames: string;
      searchKeywords: string;
      detailMarkdown: string;
      compliance: string;
      error?: string;
    }[] = [];

    let current = profile;

    for (const row of rows) {
      const kind = decideConsume(current);
      if (!kind) {
        outputs.push({
          productName: row.productName,
          platform: row.platform,
          titleCandidates: "",
          adCopies: "",
          optionNames: "",
          searchKeywords: "",
          detailMarkdown: "",
          compliance: "",
          error: "한도 부족으로 중단",
        });
        break;
      }

      try {
        const limited = kind === "free";
        const input = {
          platform: row.platform,
          productName: row.productName,
          category: row.category,
          keywords: row.keywords,
          sellingPoints: row.sellingPoints,
          brandTone: current.brand_tone || undefined,
        };
        const result = await generateCopy(input, { limited, mode: "full" });
        const saved = await consumeAndSaveGeneration({ input, result });
        current = saved.profile;

        outputs.push({
          productName: row.productName,
          platform: row.platform,
          titleCandidates: (result.titleCandidates || []).join(" | "),
          adCopies: result.adCopies.join(" | "),
          optionNames: result.optionNames.join(" | "),
          searchKeywords: result.searchKeywords.join(", "),
          detailMarkdown: result.detailMarkdown,
          compliance: result.compliance
            .map((c) => `${c.term}:${c.suggestion}`)
            .join(" / "),
        });
      } catch (err) {
        outputs.push({
          productName: row.productName,
          platform: row.platform,
          titleCandidates: "",
          adCopies: "",
          optionNames: "",
          searchKeywords: "",
          detailMarkdown: "",
          compliance: "",
          error: err instanceof Error ? err.message : "실패",
        });
      }
    }

    const header = [
      "productName",
      "platform",
      "titleCandidates",
      "adCopies",
      "optionNames",
      "searchKeywords",
      "detailMarkdown",
      "compliance",
      "error",
    ];

    const csv = [
      header.join(","),
      ...outputs.map((o) =>
        [
          o.productName,
          o.platform,
          o.titleCandidates,
          o.adCopies,
          o.optionNames,
          o.searchKeywords,
          o.detailMarkdown,
          o.compliance,
          o.error || "",
        ]
          .map((cell) => escapeCsv(String(cell)))
          .join(","),
      ),
    ].join("\n");

    return NextResponse.json({
      count: outputs.length,
      csv,
      outputs,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "대량 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
