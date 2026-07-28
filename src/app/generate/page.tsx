"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/site-header";
import { ResultPanel } from "@/components/result-panel";
import { PLATFORM_TEMPLATES } from "@/lib/platforms";
import type {
  GenerateMode,
  GenerateResult,
  Platform,
  UsageSnapshot,
} from "@/lib/types";

export default function GeneratePage() {
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>("smartstore");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [imageNote, setImageNote] = useState("");
  const [brandTone, setBrandTone] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [regeneratingMode, setRegeneratingMode] = useState<GenerateMode | null>(
    null,
  );
  const [error, setError] = useState("");

  const tpl = PLATFORM_TEMPLATES[platform];

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/me");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setUsage(data.usage);
      setEmail(data.profile?.email ?? null);
      setBrandTone(data.profile?.brand_tone || "");
    })();
  }, []);

  const usageLabel = useMemo(() => {
    if (!usage) return "";
    return `${usage.plan} · 크레딧 ${usage.credits} · 월 ${usage.monthlyUsed}/${usage.monthlyQuota || "-"} · 무료잔여 ${usage.freeRemainingToday}`;
  }, [usage]);

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          productName,
          category,
          keywords,
          sellingPoints,
          imageNote,
          brandTone,
          mode: "full",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "QUOTA") {
          throw new Error("한도 초과 — 결제 페이지에서 크레딧/플랜을 구매하세요.");
        }
        throw new Error(data.error || "생성 실패");
      }
      setResult(data.result);
      setGenerationId(data.generationId);
      setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  async function onRegenerate(mode: Exclude<GenerateMode, "full">) {
    if (!generationId) return;
    setRegeneratingMode(mode);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          productName,
          category,
          keywords,
          sellingPoints,
          imageNote,
          brandTone,
          mode,
          generationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "SUBSCRIPTION_REQUIRED") {
          throw new Error(data.error);
        }
        throw new Error(data.error || "재생성 실패");
      }
      setResult(data.result);
      setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setRegeneratingMode(null);
    }
  }

  async function saveBrandTone() {
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandTone }),
    });
  }

  return (
    <main>
      <AppNav email={email} usageLabel={usageLabel} />
      <div className="container grid gap-6 py-8 lg:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={onGenerate} className="card grid gap-4 p-6">
          <h1 className="display text-3xl font-extrabold">카피 생성</h1>
          <div className="field">
            <label>플랫폼</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
            >
              <option value="smartstore">스마트스토어</option>
              <option value="coupang">쿠팡</option>
            </select>
            <p className="text-xs text-[var(--ink-soft)]">
              {tpl.label} · 상품명 {tpl.titleMaxLen}자 · 광고 {tpl.adMaxLen}자 ·
              복붙용 HTML 자동 생성
            </p>
          </div>
          <div className="field">
            <label>상품명</label>
            <input
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예: 휴대용 미니 선풍기"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label>카테고리</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="field">
              <label>핵심 키워드</label>
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>판매 포인트</label>
            <textarea
              rows={3}
              value={sellingPoints}
              onChange={(e) => setSellingPoints(e.target.value)}
            />
          </div>
          <div className="field">
            <label>이미지/비주얼 메모 (선택)</label>
            <input value={imageNote} onChange={(e) => setImageNote(e.target.value)} />
          </div>
          <div className="field">
            <label>브랜드톤 (프로)</label>
            <div className="flex gap-2">
              <input
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value)}
                placeholder="예: 담백하고 실용적인 말투"
              />
              <button type="button" className="btn btn-ghost !px-3" onClick={saveBrandTone}>
                저장
              </button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-[var(--danger)]">
              {error}{" "}
              {error.includes("한도") && (
                <Link href="/billing" className="font-bold underline">
                  결제하기
                </Link>
              )}
            </p>
          )}
          <button className="btn btn-accent" disabled={loading || !usage?.canGenerate}>
            {loading ? "생성 중…" : "생성하기"}
          </button>
          {usage && !usage.canGenerate && (
            <Link href="/billing" className="btn btn-primary text-center">
              크레딧/플랜 구매
            </Link>
          )}
        </form>

        <section className="card p-6">
          <h2 className="display mb-4 text-2xl font-bold">고정 결과 세트</h2>
          {!result ? (
            <p className="text-[var(--ink-soft)]">
              상세 · 상품명 · 광고 · 옵션 · 키워드가 칸에 맞춰 나옵니다.
            </p>
          ) : (
            <ResultPanel
              result={result}
              productName={productName}
              platform={platform}
              generationId={generationId}
              regeneratingMode={regeneratingMode}
              onRegenerate={
                generationId && usage?.canPartialRegenerate
                  ? onRegenerate
                  : undefined
              }
              onSoftened={setResult}
            />
          )}
          {result && usage && !usage.canPartialRegenerate && (
            <p className="mt-4 rounded-xl border border-[var(--line)] bg-[#fff8ef] px-4 py-3 text-sm">
              상품명/광고/키워드만 다시 뽑기는{" "}
              <Link href="/billing" className="font-bold text-[var(--accent)]">
                스타터 구독
              </Link>
              부터 가능합니다. (크레딧보다 회당 단가↓)
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
