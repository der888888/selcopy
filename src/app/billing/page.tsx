"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { AppNav } from "@/components/site-header";
import { PRODUCTS, PLANS } from "@/lib/plans";
import type { UsageSnapshot } from "@/lib/types";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        options: Record<string, unknown>,
      ) => Promise<void>;
    };
  }
}

export default function BillingPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/me");
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setEmail(data.profile?.email ?? null);
    setUsage(data.usage);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function buy(productCode: keyof typeof PRODUCTS) {
    setLoading(productCode);
    setMessage("");
    try {
      const prepare = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode }),
      });
      const order = await prepare.json();
      if (!prepare.ok) throw new Error(order.error || "주문 생성 실패");

      // 토스 키가 없으면 데모 즉시 결제
      if (!order.tossReady || !order.clientKey || !window.TossPayments) {
        const confirm = await fetch("/api/payments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productCode,
            orderId: order.orderId,
            amount: order.amount,
            demoForce: true,
          }),
        });
        const data = await confirm.json();
        if (!confirm.ok) throw new Error(data.error || "결제 실패");
        setMessage(`${PRODUCTS[productCode].name} 적용 완료 (데모 결제)`);
        await refresh();
        return;
      }

      const toss = window.TossPayments(order.clientKey);
      await toss.requestPayment("카드", {
        amount: order.amount,
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${window.location.origin}/billing/success?productCode=${productCode}`,
        failUrl: `${window.location.origin}/billing/fail`,
        customerEmail: email || undefined,
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "결제 오류");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main>
      <Script src="https://js.tosspayments.com/v1/payment" strategy="lazyOnload" />
      <AppNav
        email={email}
        usageLabel={usage ? `${usage.plan} · 크레딧 ${usage.credits}` : undefined}
      />

      <section className="container py-8">
        <h1 className="display text-3xl font-extrabold">결제 · 한도</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          토스 키가 없으면 로컬 데모 결제로 즉시 적립됩니다.
        </p>

        {usage && (
          <div className="card mt-6 grid gap-2 p-5 sm:grid-cols-4">
            <Stat label="플랜" value={usage.plan} />
            <Stat label="크레딧" value={String(usage.credits)} />
            <Stat
              label="월 사용"
              value={`${usage.monthlyUsed}/${usage.monthlyQuota || 0}`}
            />
            <Stat label="오늘 무료" value={String(usage.freeRemainingToday)} />
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ProductCard
            title={PRODUCTS.credits_30.name}
            price={`${PRODUCTS.credits_30.amount.toLocaleString()}원`}
            desc={PRODUCTS.credits_30.description}
            loading={loading === "credits_30"}
            onBuy={() => buy("credits_30")}
          />
          <ProductCard
            title={PLANS.starter.name}
            price={PLANS.starter.priceLabel}
            desc="30일 이용 · 월 50회"
            loading={loading === "plan_starter"}
            onBuy={() => buy("plan_starter")}
          />
          <ProductCard
            title={PLANS.pro.name}
            price={PLANS.pro.priceLabel}
            desc="30일 이용 · 월 200회 · HTML/브랜드톤"
            loading={loading === "plan_pro"}
            onBuy={() => buy("plan_pro")}
            highlight
          />
        </div>

        {message && (
          <p className="mt-6 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-[var(--ink-soft)]">{label}</p>
      <p className="display text-2xl font-bold">{value}</p>
    </div>
  );
}

function ProductCard(props: {
  title: string;
  price: string;
  desc: string;
  loading: boolean;
  onBuy: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      className="card p-5"
      style={
        props.highlight
          ? { borderColor: "color-mix(in srgb, var(--accent) 45%, var(--line))" }
          : undefined
      }
    >
      <h2 className="display text-2xl font-bold">{props.title}</h2>
      <p className="mt-2 text-3xl font-extrabold">{props.price}</p>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">{props.desc}</p>
      <button
        className={`btn mt-5 w-full ${props.highlight ? "btn-accent" : "btn-primary"}`}
        disabled={props.loading}
        onClick={props.onBuy}
      >
        {props.loading ? "처리 중…" : "구매"}
      </button>
    </div>
  );
}
