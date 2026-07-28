import { NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeAndSaveGeneration,
  consumeAndUpdateGeneration,
  getCurrentProfile,
  getGenerationById,
} from "@/lib/auth";
import { generateCopy } from "@/lib/generate";
import { decideConsume } from "@/lib/credits";
import { applyComplianceSoftening, attachCompliance } from "@/lib/compliance";
import type { GenerateResult, GenerationRow } from "@/lib/types";

const schema = z.object({
  platform: z.enum(["smartstore", "coupang"]),
  productName: z.string().min(1).max(120),
  category: z.string().max(80).optional().default(""),
  keywords: z.string().max(200).optional().default(""),
  sellingPoints: z.string().max(1000).optional().default(""),
  imageNote: z.string().max(500).optional(),
  brandTone: z.string().max(300).optional(),
  mode: z.enum(["full", "ads_keywords"]).optional().default("full"),
  generationId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const kind = decideConsume(profile);
    if (!kind) {
      return NextResponse.json(
        { error: "생성 한도가 부족합니다.", code: "QUOTA" },
        { status: 402 },
      );
    }

    const body = schema.parse(await request.json());
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

    if (body.mode === "ads_keywords") {
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
        mode: "ads_keywords",
      });

      const merged: GenerateResult = applyComplianceSoftening(
        attachCompliance({
          ...existing.result,
          adCopies: partial.adCopies,
          searchKeywords: partial.searchKeywords,
          watermarked: limited,
          compliance: [],
          titleCandidates: existing.result.titleCandidates || [],
        }),
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
        mode: "ads_keywords",
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
