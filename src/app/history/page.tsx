"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/site-header";
import { ResultPanel } from "@/components/result-panel";
import type {
  GenerateMode,
  GenerationRow,
  UsageSnapshot,
} from "@/lib/types";

export default function HistoryPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [items, setItems] = useState<GenerationRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [regeneratingMode, setRegeneratingMode] = useState<GenerateMode | null>(
    null,
  );
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/me");
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setEmail(data.profile?.email ?? null);
    setUsage(data.usage);
    setItems(data.generations || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function regenerate(
    item: GenerationRow,
    mode: Exclude<GenerateMode, "full">,
  ) {
    setRegeneratingId(item.id);
    setRegeneratingMode(mode);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: item.platform,
          productName: item.product_name,
          category: item.category || "",
          keywords: item.keywords || "",
          sellingPoints: item.selling_points || "",
          mode,
          generationId: item.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "재생성 실패");
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, result: data.result } : row,
        ),
      );
      setUsage(data.usage);
      setOpenId(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setRegeneratingId(null);
      setRegeneratingMode(null);
    }
  }

  return (
    <main>
      <AppNav
        email={email}
        usageLabel={usage ? `${usage.plan} · 크레딧 ${usage.credits}` : undefined}
      />
      <section className="container py-8">
        <h1 className="display text-3xl font-extrabold">생성 이력</h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          상세는 두고 상품명 / 광고 / 키워드만 따로 다시 뽑을 수 있습니다.
        </p>
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

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
                {item.platform === "coupang" ? "쿠팡" : "스마트스토어"} ·{" "}
                {item.category || "카테고리 없음"}
                {item.is_free ? " · 무료" : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn btn-ghost !px-3 !py-1.5 text-sm"
                  onClick={() =>
                    setOpenId((id) => (id === item.id ? null : item.id))
                  }
                >
                  {openId === item.id ? "접기" : "결과 보기"}
                </button>
                <button
                  className="btn btn-ghost !px-3 !py-1.5 text-sm"
                  disabled={
                    regeneratingId === item.id ||
                    !usage?.canGenerate ||
                    !usage?.canPartialRegenerate
                  }
                  onClick={() => regenerate(item, "titles")}
                >
                  상품명만
                </button>
                <button
                  className="btn btn-ghost !px-3 !py-1.5 text-sm"
                  disabled={
                    regeneratingId === item.id ||
                    !usage?.canGenerate ||
                    !usage?.canPartialRegenerate
                  }
                  onClick={() => regenerate(item, "ads")}
                >
                  광고만
                </button>
                <button
                  className="btn btn-accent !px-3 !py-1.5 text-sm"
                  disabled={
                    regeneratingId === item.id ||
                    !usage?.canGenerate ||
                    !usage?.canPartialRegenerate
                  }
                  onClick={() => regenerate(item, "keywords")}
                >
                  키워드만
                </button>
              </div>
              {usage && !usage.canPartialRegenerate && (
                <p className="mt-2 text-xs text-[var(--ink-soft)]">
                  부분 재생성은{" "}
                  <a href="/billing" className="font-bold text-[var(--accent)]">
                    스타터 구독
                  </a>
                  부터 가능합니다.
                </p>
              )}
              {openId === item.id && item.result && (
                <div className="mt-4 border-t border-[var(--line)] pt-4">
                  <ResultPanel
                    result={{
                      ...item.result,
                      titleCandidates: item.result.titleCandidates || [],
                      compliance: item.result.compliance || [],
                    }}
                    productName={item.product_name}
                    platform={item.platform}
                    generationId={item.id}
                    regeneratingMode={
                      regeneratingId === item.id ? regeneratingMode : null
                    }
                    onRegenerate={
                      usage?.canPartialRegenerate
                        ? (mode) => regenerate(item, mode)
                        : undefined
                    }
                    onSoftened={(next) =>
                      setItems((prev) =>
                        prev.map((row) =>
                          row.id === item.id ? { ...row, result: next } : row,
                        ),
                      )
                    }
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
