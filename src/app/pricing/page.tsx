import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PLANS, PRODUCTS } from "@/lib/plans";

export default function PricingPage() {
  return (
    <main>
      <SiteHeader />
      <section className="container py-14">
        <h1 className="display text-4xl font-extrabold md:text-5xl">요금제</h1>
        <p className="mt-3 max-w-2xl text-[var(--ink-soft)]">
          처음부터 유료 전환이 쉬운 구조입니다. 무료는 맛보기, 본 사용은 구독 또는 크레딧.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {Object.values(PLANS).map((plan) => (
            <div key={plan.id} className="card flex flex-col p-6">
              <p className="text-sm font-bold text-[var(--accent)]">{plan.name}</p>
              <p className="display mt-2 text-4xl font-extrabold">{plan.priceLabel}</p>
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
              {PRODUCTS.credits_30.amount.toLocaleString()}원 ·{" "}
              {PRODUCTS.credits_30.description}
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
