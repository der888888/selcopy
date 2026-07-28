import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PLANS, PRODUCTS, formatWon } from "@/lib/plans";

export default function PricingPage() {
  return (
    <main>
      <SiteHeader />
      <section className="container py-14">
        <h1 className="display text-4xl font-extrabold md:text-5xl">요금제</h1>
        <p className="mt-3 max-w-2xl text-[var(--ink-soft)]">
          크레딧은 단발, 구독은 대량·재생성까지. 회당 단가로 보면 스타터부터가 이득입니다.
        </p>

        <div className="card mt-8 grid gap-3 p-5 sm:grid-cols-3">
          <Compare
            label="크레딧"
            value={`${formatWon(PRODUCTS.credits_30.perUse)}/회`}
            note="대량·재생성 없음"
          />
          <Compare
            label="스타터"
            value={`${formatWon(PRODUCTS.plan_starter.perUse)}/회`}
            note="대량+재생성 포함"
            accent
          />
          <Compare
            label="프로"
            value={`${formatWon(PRODUCTS.plan_pro.perUse)}/회`}
            note="월 200회"
          />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {Object.values(PLANS).map((plan) => (
            <div key={plan.id} className="card flex flex-col p-6">
              <p className="text-sm font-bold text-[var(--accent)]">{plan.name}</p>
              <p className="display mt-2 text-4xl font-extrabold">{plan.priceLabel}</p>
              {plan.perUse != null && (
                <p className="mt-1 text-sm font-bold text-[var(--ink-soft)]">
                  회당 약 {formatWon(plan.perUse)}
                </p>
              )}
              <ul className="mt-5 flex-1 space-y-2 text-sm text-[var(--ink-soft)]">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <Link
                href={plan.id === "free" ? "/login" : "/billing"}
                className="btn btn-primary mt-6"
              >
                {plan.id === "free" ? "무료로 시작" : "구매하기"}
              </Link>
            </div>
          ))}
        </div>

        <div className="card mt-6 p-6 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="display text-2xl font-bold">{PRODUCTS.credits_30.name}</h2>
            <p className="mt-1 text-[var(--ink-soft)]">
              {formatWon(PRODUCTS.credits_30.amount)} · {PRODUCTS.credits_30.description}
            </p>
          </div>
          <Link href="/billing" className="btn btn-accent mt-4 md:mt-0">
            크레딧 구매
          </Link>
        </div>
      </section>
    </main>
  );
}

function Compare({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-[var(--ink-soft)]">{label}</p>
      <p
        className={`display text-2xl font-extrabold ${
          accent ? "text-[var(--accent)]" : ""
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-[var(--ink-soft)]">{note}</p>
    </div>
  );
}
