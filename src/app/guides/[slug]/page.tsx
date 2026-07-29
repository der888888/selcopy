import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { GUIDES, getGuide } from "@/lib/guides";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: `${guide.title} | 셀카피`,
    description: guide.description,
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `https://selcopy.vercel.app/guides/${guide.slug}`,
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <main>
      <SiteHeader />
      <article className="container max-w-3xl py-12">
        <p className="text-sm font-bold text-[var(--accent)]">{guide.keyword}</p>
        <h1 className="display mt-2 text-4xl font-extrabold leading-tight">
          {guide.title}
        </h1>
        <p className="mt-3 text-[var(--ink-soft)]">{guide.description}</p>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          업데이트 {guide.updatedAt}
        </p>

        <div className="mt-10 space-y-8">
          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="display text-2xl font-bold">{section.heading}</h2>
              {section.body.map((p) => (
                <p
                  key={p.slice(0, 24)}
                  className="mt-3 leading-relaxed text-[var(--ink-soft)]"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="card mt-12 p-6">
          <h2 className="display text-2xl font-bold">초안이 필요하면</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            상품명·키워드만 넣으면 상세·광고·옵션·검색어를 한 번에 뽑습니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/generate" className="btn btn-accent">
              셀카피에서 생성
            </Link>
            <Link href="/guides" className="btn btn-ghost">
              가이드 목록
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
