"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/site-header";
import type { GenerateResult, UsageSnapshot } from "@/lib/types";
import Link from "next/link";

export default function GeneratePage() {
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"smartstore" | "coupang">("smartstore");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [imageNote, setImageNote] = useState("");
  const [brandTone, setBrandTone] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

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
      setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  async function saveBrandTone() {
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandTone }),
    });
  }

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  }

  function downloadHtml() {
    if (!result) return;
    const blob = new Blob([result.detailHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productName || "detail"}.html`;
    a.click();
    URL.revokeObjectURL(url);
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
              onChange={(e) => setPlatform(e.target.value as "smartstore" | "coupang")}
            >
              <option value="smartstore">스마트스토어</option>
              <option value="coupang">쿠팡</option>
            </select>
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="display text-2xl font-bold">결과</h2>
            {result && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-ghost !py-2 !px-3 text-sm"
                  onClick={() => copyText("md", result.detailMarkdown)}
                >
                  {copied === "md" ? "복사됨" : "본문 복사"}
                </button>
                <button
                  className="btn btn-ghost !py-2 !px-3 text-sm"
                  onClick={downloadHtml}
                >
                  HTML 다운로드
                </button>
              </div>
            )}
          </div>

          {!result ? (
            <p className="text-[var(--ink-soft)]">아직 생성된 결과가 없습니다.</p>
          ) : (
            <div className="space-y-6">
              <Block title="상세 본문">
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7f4ee] p-4 text-sm">
                  {result.detailMarkdown}
                </pre>
              </Block>
              <Block title="광고 문구">
                <ul className="space-y-2">
                  {result.adCopies.map((c) => (
                    <li
                      key={c}
                      className="flex items-start justify-between gap-3 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
                    >
                      <span>{c}</span>
                      <button
                        className="shrink-0 text-xs font-bold text-[var(--accent)]"
                        onClick={() => copyText(c, c)}
                      >
                        복사
                      </button>
                    </li>
                  ))}
                </ul>
              </Block>
              <Block title="옵션명">
                <p className="text-sm">{result.optionNames.join(" · ")}</p>
              </Block>
              <Block title="검색 키워드">
                <p className="text-sm">{result.searchKeywords.join(", ")}</p>
              </Block>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-[var(--accent)]">{title}</h3>
      {children}
    </div>
  );
}
