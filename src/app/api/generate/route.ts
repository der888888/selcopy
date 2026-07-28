import { NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeAndSaveGeneration,
  consumeAndUpdateGeneration,
  getCurrentProfile,
  getGenerationById,
  saveGenerationResult,
} from "@/lib/auth";
import { generateCopy } from "@/lib/generate";
import { decideConsume } from "@/lib/credits";
import { applyComplianceSoftening } from "@/lib/compliance";
import { finalizeForPlatform } from "@/lib/format";
import { isPaidPlan } from "@/lib/plans";
import type { GenerateMode, GenerateResult, GenerationRow } from "@/lib/types";

const modeSchema = z.enum([
  "full",
  "ads",
  "titles",
  "keywords",
  "ads_keywords",
]);

const schema = z.object({
  platform: z.enum(["smartstore", "coupang"]),
  productName: z.string().min(1).max(120),
  category: z.string().max(80).optional().default(""),
  keywords: z.string().max(200).optional().default(""),
  sellingPoints: z.string().max(1000).optional().default(""),
  imageNote: z.string().max(500).optional(),
  brandTone: z.string().max(300).optional(),
  mode: modeSchema.optional().default("full"),
  generationId: z.string().optional(),
  action: z.enum(["generate", "soften"]).optional().default("generate"),
  result: z.any().optional(),
  fromBulk: z.boolean().optional().default(false),
});

function mergePartial(
  existing: GenerateResult,
  partial: GenerateResult,
  mode: GenerateMode,
  limited: boolean,
): GenerateResult {
  const next: GenerateResult = {
    ...existing,
    watermarked: limited,
    titleCandidates: existing.titleCandidates || [],
    compliance: [],
  };
  if (mode === "ads" || mode === "ads_keywords") {
    next.adCopies = partial.adCopies;
  }
  if (mode === "ads_keywords" || mode === "keywords") {
    next.searchKeywords = partial.searchKeywords;
  }
  if (mode === "titles") {
    next.titleCandidates = partial.titleCandidates;
  }
  return next;
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = schema.parse(await request.json());

    // 원클릭 순화 — 크레딧 차감 없음
    if (body.action === "soften") {
      if (!body.generationId || !body.result) {
        return NextResponse.json(
          { error: "순화할 결과가 필요합니다." },
          { status: 400 },
        );
      }
      const softened = finalizeForPlatform(
        body.platform,
        applyComplianceSoftening(body.result as GenerateResult),
      );
      await saveGenerationResult({
        id: body.generationId,
        result: softened,
      });
      return NextResponse.json({
        result: softened,
        generationId: body.generationId,
        mode: "soften",
      });
    }

    const kind = decideConsume(profile);
    if (!kind) {
      return NextResponse.json(
        { error: "생성 한도가 부족합니다.", code: "QUOTA" },
        { status: 402 },
      );
    }

    if (body.fromBulk && !isPaidPlan(profile.plan)) {
      return NextResponse.json(
        {
          error: "CSV 대량 생성은 스타터 이상 구독 기능입니다.",
          code: "SUBSCRIPTION_REQUIRED",
        },
        { status: 403 },
      );
    }

    const limited = kind === "free";
    const input = {
      platform: body.platform,
      productName: body.productName,
      category: body.category,
      keywords: body.keywords,
      sellingPoints: body.sellingPoints,
      imageNote: body.imageNote,
      brandTone: body.brandTone || profile.brand_tone || undefined,
    };

    if (body.mode !== "full") {
      if (!isPaidPlan(profile.plan)) {
        return NextResponse.json(
          {
            error:
              "상품명/광고/키워드만 재생성은 스타터 이상 구독 기능입니다.",
            code: "SUBSCRIPTION_REQUIRED",
          },
          { status: 403 },
        );
      }
      if (!body.generationId) {
        return NextResponse.json(
          { error: "재생성할 이력 ID가 필요합니다." },
          { status: 400 },
        );
      }
      const existing = (await getGenerationById(
        body.generationId,
      )) as GenerationRow | null;
      if (!existing) {
        return NextResponse.json(
          { error: "이력을 찾을 수 없습니다." },
          { status: 404 },
        );
      }

      const partial = await generateCopy(input, {
        limited,
        mode: body.mode,
      });

      const merged = finalizeForPlatform(
        body.platform,
        mergePartial(existing.result, partial, body.mode, limited),
      );

      const saved = await consumeAndUpdateGeneration({
        id: body.generationId,
        result: merged,
      });

      return NextResponse.json({
        result: merged,
        usage: saved.usage,
        generationId: saved.generation.id,
        consumed: kind,
        mode: body.mode,
      });
    }

    const result = await generateCopy(input, { limited, mode: "full" });
    const saved = await consumeAndSaveGeneration({ input, result });

    return NextResponse.json({
      result,
      usage: saved.usage,
      generationId: saved.generation.id,
      consumed: kind,
      mode: "full",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
