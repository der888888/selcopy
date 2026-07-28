"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { AppNav } from "@/components/site-header";
import { PRODUCTS, PLANS, formatWon } from "@/lib/plans";
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

  const breakEven = useMemo(() => {
    if (!usage) return null;
    const creditPer = PRODUCTS.credits_30.perUse;
    const starterPer = PRODUCTS.plan_starter.perUse;
    // 크레딧으로 N회 하면 스타터보다 비싸지는 지점
    const n = Math.ceil(PRODUCTS.plan_starter.amount / creditPer);
    return { creditPer, starterPer, n, used: usage.monthlyUsed };
  }, [usage]);

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
          크레딧은 맛보기, 대량·재생성은 구독이 더 저렴합니다.
        </p>

        {usage && (
          <div className="card mt-6 grid gap-2 p-5 sm:grid-cols-4">
            <Stat label="플랜" value={usage.plan} />
            <Stat label="크레딧" value={String(usage.credits)} />
            <Stat
              label="월 사용"
              value={`${usage.monthlyUsed}/${usage.monthlyQuota || 0}`}
            />
            <Stat
              label="구독 기능"
              value={usage.canBulk ? "대량·재생성 ON" : "잠김"}
            />
          </div>
        )}

        {breakEven && (
          <div className="card mt-4 border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] p-5">
            <h2 className="display text-xl font-bold">회당 단가 비교</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-[var(--ink-soft)]">크레딧</p>
                <p className="text-2xl font-extrabold">
                  {formatWon(breakEven.creditPer)}
                  <span className="text-sm font-semibold">/회</span>
                </p>
              </div>
              <div>
                <p className="text-[var(--ink-soft)]">스타터</p>
                <p className="text-2xl font-extrabold text-[var(--accent)]">
                  {formatWon(breakEven.starterPer)}
                  <span className="text-sm font-semibold">/회</span>
                </p>
              </div>
              <div>
                <p className="text-[var(--ink-soft)]">프로</p>
                <p className="text-2xl font-extrabold">
                  {formatWon(PRODUCTS.plan_pro.perUse)}
                  <span className="text-sm font-semibold">/회</span>
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              크레딧으로 약 <strong>{breakEven.n}회</strong> 쓰면 스타터 구독이 더
              이득입니다.
              {breakEven.used > 0 && (
                <>
                  {" "}
                  이번 달 이미 <strong>{breakEven.used}회</strong> 사용.
                </>
              )}
            </p>
            {!usage?.canBulk && (
              <p className="mt-2 text-sm font-semibold text-[var(--accent)]">
                CSV 대량·부분 재생성은 스타터 이상에서만 열립니다.
              </p>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <ProductCard
            title={PRODUCTS.credits_30.name}
            price={formatWon(PRODUCTS.credits_30.amount)}
            perUse={`회당 ${formatWon(PRODUCTS.credits_30.perUse)}`}
            desc={PRODUCTS.credits_30.description}
            loading={loading === "credits_30"}
            onBuy={() => buy("credits_30")}
          />
          <ProductCard
            title={PLANS.starter.name}
            price={PLANS.starter.priceLabel}
            perUse={`회당 약 ${formatWon(PRODUCTS.plan_starter.perUse)}`}
            desc={PRODUCTS.plan_starter.description}
            loading={loading === "plan_starter"}
            onBuy={() => buy("plan_starter")}
            highlight
            badge="추천"
          />
          <ProductCard
            title={PLANS.pro.name}
            price={PLANS.pro.priceLabel}
            perUse={`회당 약 ${formatWon(PRODUCTS.plan_pro.perUse)}`}
            desc={PRODUCTS.plan_pro.description}
            loading={loading === "plan_pro"}
            onBuy={() => buy("plan_pro")}
          />
        </div>

        {message && (
          <p className="mt-6 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
            {message}
          </p>
        )}

        <p className="mt-6 text-sm text-[var(--ink-soft)]">
          요금 상세는 <Link href="/pricing" className="font-bold text-[var(--accent)]">요금제</Link>에서
          볼 수 있습니다.
        </p>
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
  perUse: string;
  desc: string;
  loading: boolean;
  onBuy: () => void;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div
      className="card relative p-5"
      style={
        props.highlight
          ? { borderColor: "color-mix(in srgb, var(--accent) 45%, var(--line))" }
          : undefined
      }
    >
      {props.badge && (
        <span className="badge absolute right-4 top-4">{props.badge}</span>
      )}
      <h2 className="display text-2xl font-bold">{props.title}</h2>
      <p className="mt-2 text-3xl font-extrabold">{props.price}</p>
      <p className="mt-1 text-sm font-bold text-[var(--accent)]">{props.perUse}</p>
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
