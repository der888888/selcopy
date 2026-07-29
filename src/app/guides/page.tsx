import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "셀러 가이드 | 셀카피",
  description:
    "스마트스토어·쿠팡 상세페이지, 상품명, 광고 문구, 금지어, CSV 일괄 작성 가이드.",
};

export default function GuidesPage() {
  return (
    <main>
      <SiteHeader />
      <section className="container py-12">
        <h1 className="display text-4xl font-extrabold">셀러 가이드</h1>
        <p className="mt-3 max-w-2xl text-[var(--ink-soft)]">
          검색으로 들어온 셀러가 바로 따라 할 수 있는 실무 글입니다. 초안은{" "}
          <Link href="/generate" className="font-bold text-[var(--accent)]">
            셀카피
          </Link>
          에서 만들 수 있습니다.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="card block p-5 transition hover:-translate-y-0.5"
            >
              <p className="text-xs font-bold text-[var(--accent)]">
                {guide.keyword}
              </p>
              <h2 className="display mt-2 text-xl font-bold">{guide.title}</h2>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {guide.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
