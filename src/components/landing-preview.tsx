"use client";

import { useState } from "react";
import Link from "next/link";
import type { GenerateResult } from "@/lib/types";

export function LandingPreview() {
  const [productName, setProductName] = useState("스테인리스 보온병 500ml");
  const [category, setCategory] = useState("생활/주방");
  const [keywords, setKeywords] = useState("보온병, 캠핑, 출퇴근");
  const [sellingPoints, setSellingPoints] = useState(
    "12시간 보온, 가벼운 무게, 세척 쉬운 입구",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState("");

  async function onGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/guest-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "smartstore",
          productName,
          category,
          keywords,
          sellingPoints,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "실패");
      setResult(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="container grid gap-6 py-10 md:grid-cols-[1.05fr_0.95fr]">
      <div className="card fade-up p-6 md:p-8">
        <p className="badge mb-4">가입 없이 1회 미리보기</p>
        <div className="grid gap-4">
          <div className="field">
            <label>상품명</label>
            <input value={productName} onChange={(e) => setProductName(e.target.value)} />
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
          <button className="btn btn-accent" disabled={loading} onClick={onGenerate}>
            {loading ? "생성 중…" : "상세·광고 초안 뽑기"}
          </button>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </div>
      </div>

      <div className="card drift fade-up p-6 md:p-8" style={{ animationDelay: "120ms" }}>
        <h2 className="display mb-4 text-2xl font-bold">결과 미리보기</h2>
        {!result ? (
          <p className="leading-relaxed text-[var(--ink-soft)]">
            왼쪽에서 생성하면 상세 초안과 광고 문구가 여기에 나타납니다.
            무료 미리보기는 길이가 제한됩니다.
          </p>
        ) : (
          <div className="space-y-5">
            <div>
              <h3 className="mb-2 text-sm font-bold text-[var(--accent)]">상세 초안</h3>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7f4ee] p-4 text-sm leading-relaxed">
                {result.detailMarkdown}
              </pre>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold text-[var(--accent)]">광고 문구</h3>
              <ul className="space-y-2 text-sm">
                {result.adCopies.map((copy) => (
                  <li key={copy} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2">
                    {copy}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/login" className="btn btn-primary w-full">
              저장·전체 생성은 로그인 후
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
