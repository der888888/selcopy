import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentProfile, getDemoToken } from "@/lib/auth";
import { isDemoMode, hasToss } from "@/lib/env";
import { getProduct } from "@/lib/toss";
import { demoConfirmPayment, demoCreatePayment } from "@/lib/demo-store";
import { createAdminClient } from "@/lib/supabase/middleware";
import { applyPurchase } from "@/lib/credits";
import type { ProductCode } from "@/lib/plans";
import type { Profile } from "@/lib/types";

const prepareSchema = z.object({
  productCode: z.enum(["credits_30", "plan_starter", "plan_pro"]),
});

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { productCode } = prepareSchema.parse(await request.json());
  const product = getProduct(productCode);
  if (!product) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 400 });
  }

  const orderId = `selcopy_${Date.now()}_${randomUUID().slice(0, 8)}`;

  if (isDemoMode()) {
    const token = await getDemoToken();
    await demoCreatePayment({
      token: token!,
      orderId,
      productCode,
      amount: product.amount,
    });
    return NextResponse.json({
      demo: true,
      orderId,
      amount: product.amount,
      orderName: product.name,
      productCode,
      clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || null,
      tossReady: hasToss(),
    });
  }

  const admin = createAdminClient();
  await admin.from("payments").insert({
    user_id: profile.id,
    order_id: orderId,
    product_code: productCode,
    amount: product.amount,
    status: "pending",
  });

  return NextResponse.json({
    demo: false,
    orderId,
    amount: product.amount,
    orderName: product.name,
    productCode,
    clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY,
    tossReady: hasToss(),
  });
}

const confirmSchema = z.object({
  productCode: z.enum(["credits_30", "plan_starter", "plan_pro"]),
  orderId: z.string(),
  paymentKey: z.string().optional(),
  amount: z.number().int().positive(),
  demoForce: z.boolean().optional(),
});

export async function PUT(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = confirmSchema.parse(await request.json());
    const product = getProduct(body.productCode);
    if (!product || product.amount !== body.amount) {
      return NextResponse.json({ error: "금액이 올바르지 않습니다." }, { status: 400 });
    }

    // 데모 모드 또는 토스 미설정: 즉시 적립 (로컬 검증용)
    if (isDemoMode()) {
      const token = await getDemoToken();
      const next = await demoConfirmPayment({
        token: token!,
        orderId: body.orderId,
        productCode: body.productCode as ProductCode,
      });
      return NextResponse.json({ ok: true, profile: next, demo: true });
    }

    if (body.demoForce || !hasToss()) {
      const admin = createAdminClient();
      const patch = applyPurchase(profile, body.productCode as ProductCode);
      await admin
        .from("payments")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
          raw: { demoForce: true },
        })
        .eq("order_id", body.orderId);
      const { data } = await admin
        .from("profiles")
        .update(patch)
        .eq("id", profile.id)
        .select("*")
        .single();
      return NextResponse.json({ ok: true, profile: data as Profile, demo: true });
    }

    if (!body.paymentKey) {
      return NextResponse.json({ error: "paymentKey가 필요합니다." }, { status: 400 });
    }

    const { confirmTossPayment } = await import("@/lib/toss");
    const paid = await confirmTossPayment({
      paymentKey: body.paymentKey,
      orderId: body.orderId,
      amount: body.amount,
    });

    const admin = createAdminClient();
    await admin
      .from("payments")
      .update({
        status: "paid",
        payment_key: body.paymentKey,
        raw: paid,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", body.orderId);

    const patch = applyPurchase(profile, body.productCode as ProductCode);
    const { data } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", profile.id)
      .select("*")
      .single();

    return NextResponse.json({
      ok: true,
      profile: data as Profile,
      demo: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "결제 확인에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
