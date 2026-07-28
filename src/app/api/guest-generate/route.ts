import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCopy } from "@/lib/generate";

const schema = z.object({
  platform: z.enum(["smartstore", "coupang"]).default("smartstore"),
  productName: z.string().min(1).max(120),
  category: z.string().max(80).optional().default(""),
  keywords: z.string().max(200).optional().default(""),
  sellingPoints: z.string().max(1000).optional().default(""),
});

// 랜딩 미리보기 — 가입 없이 제한 결과
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await generateCopy(
      {
        platform: body.platform,
        productName: body.productName,
        category: body.category,
        keywords: body.keywords,
        sellingPoints: body.sellingPoints,
      },
      { limited: true },
    );
    return NextResponse.json({ result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "미리보기에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
