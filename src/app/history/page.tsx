"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/site-header";
import type { GenerationRow, UsageSnapshot } from "@/lib/types";

export default function HistoryPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [items, setItems] = useState<GenerationRow[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setEmail(data.profile?.email ?? null);
      setUsage(data.usage);
      setItems(data.generations || []);
    })();
  }, []);

  return (
    <main>
      <AppNav
        email={email}
        usageLabel={
          usage
            ? `${usage.plan} · 크레딧 ${usage.credits}`
            : undefined
        }
      />
      <section className="container py-8">
        <h1 className="display text-3xl font-extrabold">생성 이력</h1>
        <p className="mt-2 text-[var(--ink-soft)]">최근 생성 결과 50건까지 보관됩니다.</p>

        <div className="mt-6 grid gap-4">
          {items.length === 0 && (
            <div className="card p-6 text-[var(--ink-soft)]">아직 이력이 없습니다.</div>
          )}
          {items.map((item) => (
            <article key={item.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{item.product_name}</h2>
                <span className="text-xs text-[var(--ink-soft)]">
                  {new Date(item.created_at).toLocaleString("ko-KR")}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                {item.platform} · {item.category || "카테고리 없음"}
                {item.is_free ? " · 무료" : ""}
              </p>
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7f4ee] p-3 text-sm">
                {item.result?.detailMarkdown}
              </pre>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
