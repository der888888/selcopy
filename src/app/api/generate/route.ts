import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeAndSaveGeneration, getCurrentProfile } from "@/lib/auth";
import { generateCopy } from "@/lib/generate";
import { decideConsume } from "@/lib/credits";

const schema = z.object({
  platform: z.enum(["smartstore", "coupang"]),
  productName: z.string().min(1).max(120),
  category: z.string().max(80).optional().default(""),
  keywords: z.string().max(200).optional().default(""),
  sellingPoints: z.string().max(1000).optional().default(""),
  imageNote: z.string().max(500).optional(),
  brandTone: z.string().max(300).optional(),
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
    const result = await generateCopy(
      {
        platform: body.platform,
        productName: body.productName,
        category: body.category,
        keywords: body.keywords,
        sellingPoints: body.sellingPoints,
        imageNote: body.imageNote,
        brandTone: body.brandTone || profile.brand_tone || undefined,
      },
      { limited },
    );

    const saved = await consumeAndSaveGeneration({
      input: {
        platform: body.platform,
        productName: body.productName,
        category: body.category,
        keywords: body.keywords,
        sellingPoints: body.sellingPoints,
        imageNote: body.imageNote,
        brandTone: body.brandTone,
      },
      result,
    });

    return NextResponse.json({
      result,
      usage: saved.usage,
      generationId: saved.generation.id,
      consumed: kind,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
