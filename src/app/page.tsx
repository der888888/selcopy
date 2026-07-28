import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { LandingPreview } from "@/components/landing-preview";
import { PLANS } from "@/lib/plans";

export default function HomePage() {
  return (
    <main>
      <SiteHeader />

      <section className="container grid items-end gap-10 pb-6 pt-8 md:grid-cols-[1.15fr_0.85fr] md:pt-14">
        <div className="fade-up">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
            Selcopy
          </p>
          <h1 className="display max-w-3xl text-5xl font-extrabold leading-[1.05] md:text-7xl">
            셀카피
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--ink-soft)] md:text-xl">
            상품명·키워드만 넣으면 스마트스토어·쿠팡용 상세페이지 초안,
            광고 문구, 옵션명까지 한 번에.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/generate" className="btn btn-primary">
              지금 생성하기
            </Link>
            <Link href="/pricing" className="btn btn-ghost">
              요금 보기
            </Link>
          </div>
        </div>

        <div
          className="relative min-h-[280px] overflow-hidden rounded-[28px] border border-[var(--line)] fade-up"
          style={{
            background:
              "linear-gradient(145deg, #0f7a5f 0%, #163049 48%, #d97706 120%)",
            animationDelay: "80ms",
          }}
        >
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, #fff 0 2px, transparent 2.5px), radial-gradient(circle at 80% 60%, #fff 0 1.5px, transparent 2px)",
              backgroundSize: "42px 42px, 28px 28px",
            }}
          />
          <div className="relative flex h-full flex-col justify-end p-6 text-white md:p-8">
            <p className="text-sm font-semibold opacity-80">Seller workflow</p>
            <p className="display mt-2 text-3xl font-bold leading-tight">
              상품명 → 상세 HTML
              <br />
              → 광고 10개
            </p>
          </div>
        </div>
      </section>

      <LandingPreview />

      <section className="container py-16">
        <h2 className="display text-3xl font-bold md:text-4xl">한 번에 나오는 것</h2>
        <p className="mt-3 max-w-2xl text-[var(--ink-soft)]">
          만능 챗봇이 아니라, 셀러가 매일 반복하는 카피 작업만 빠르게 끝냅니다.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["고정 결과 세트", "상세·상품명·광고·옵션·키워드 칸이 정해짐"],
            ["스토어/쿠팡 템플릿", "플랫폼별 길이·톤·구성 기본값"],
            ["광고만 다시", "상세는 두고 광고·키워드만 재생성"],
            ["금지어 검수", "최고/완치/100% 등 경고·순화"],
            ["CSV 대량 생성", "상품 여러 개를 한 번에, 결과 다운로드"],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-[18px] border border-[var(--line)] bg-white/70 p-5">
              <h3 className="display text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container pb-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="display text-3xl font-bold">요금</h2>
          <Link href="/pricing" className="text-sm font-bold text-[var(--accent)]">
            자세히 보기 →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Object.values(PLANS).map((plan) => (
            <div key={plan.id} className="card p-5">
              <p className="text-sm font-bold text-[var(--ink-soft)]">{plan.name}</p>
              <p className="display mt-2 text-3xl font-extrabold">{plan.priceLabel}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--ink-soft)]">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-[var(--ink-soft)]">
          크레딧 팩 14,900원 / 30회(회당 ~497원) · 스타터는 회당 ~398원 + 대량/재생성
        </p>
      </section>

      <footer className="border-t border-[var(--line)] py-8 text-center text-sm text-[var(--ink-soft)]">
        © {new Date().getFullYear()} 셀카피 · 판매자 보조 초안 도구
      </footer>
    </main>
  );
}
