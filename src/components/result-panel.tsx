"use client";

import { useState } from "react";
import type { GenerateMode, GenerateResult, Platform } from "@/lib/types";
import { PLATFORM_TEMPLATES } from "@/lib/platforms";
import { lengthMeta } from "@/lib/format";

export function ResultPanel({
  result,
  productName,
  platform = "smartstore",
  onRegenerate,
  regeneratingMode,
  onSoftened,
  generationId,
}: {
  result: GenerateResult;
  productName?: string;
  platform?: Platform;
  onRegenerate?: (mode: Exclude<GenerateMode, "full">) => void;
  regeneratingMode?: GenerateMode | null;
  onSoftened?: (next: GenerateResult) => void;
  generationId?: string | null;
}) {
  const [copied, setCopied] = useState("");
  const [softening, setSoftening] = useState(false);
  const tpl = PLATFORM_TEMPLATES[platform];
  const highCount = (result.compliance || []).filter((c) => c.severity === "high").length;
  const warnCount = (result.compliance || []).filter((c) => c.severity === "warn").length;

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  }

  function downloadHtml() {
    const blob = new Blob([result.detailHtml], {
      type: "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productName || "detail"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function softenAll() {
    if (!generationId) {
      // 로컬만
      const { applyComplianceSoftening } = await import("@/lib/compliance");
      const { finalizeForPlatform } = await import("@/lib/format");
      const next = finalizeForPlatform(
        platform,
        applyComplianceSoftening(result),
      );
      onSoftened?.(next);
      return;
    }
    setSoftening(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "soften",
          platform,
          productName: productName || "상품",
          generationId,
          result,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "순화 실패");
      onSoftened?.(data.result);
    } finally {
      setSoftening(false);
    }
  }

  const busy = Boolean(regeneratingMode);

  return (
    <div className="space-y-6">
      {(result.compliance?.length > 0 || highCount + warnCount > 0) && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--accent-2)_45%,var(--line))] bg-[#fff8ef] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[var(--accent-2)]">
              등록 전 검수
              {highCount > 0 && (
                <span className="ml-2 rounded-full bg-[#fde8e6] px-2 py-0.5 text-xs text-[var(--danger)]">
                  위험 {highCount}
                </span>
              )}
              {warnCount > 0 && (
                <span className="ml-2 rounded-full bg-[#fff1d6] px-2 py-0.5 text-xs text-[var(--accent-2)]">
                  주의 {warnCount}
                </span>
              )}
            </h3>
            <button
              className="btn btn-accent !px-3 !py-1.5 text-xs"
              disabled={softening || !result.compliance?.length}
              onClick={softenAll}
            >
              {softening ? "순화 중…" : "한 번에 순화 적용"}
            </button>
          </div>
          {result.compliance?.length ? (
            <ul className="mt-2 space-y-1 text-sm text-[var(--ink-soft)]">
              {result.compliance.map((issue) => (
                <li key={`${issue.term}-${issue.locations.join(",")}`}>
                  <strong className="text-[var(--ink)]">{issue.term}</strong>
                  <span
                    className={`ml-2 text-xs font-bold ${
                      issue.severity === "high"
                        ? "text-[var(--danger)]"
                        : "text-[var(--accent-2)]"
                    }`}
                  >
                    {issue.severity === "high" ? "위험" : "주의"}
                  </span>
                  {" · "}
                  {issue.suggestion}
                  {" ("}
                  {issue.locations.join(", ")}
                  {")"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--accent)]">검수 통과에 가깝습니다.</p>
          )}
          <p className="mt-2 text-xs text-[var(--ink-soft)]">
            순화는 크레딧을 쓰지 않습니다. 최종 검수는 판매자 책임입니다.
          </p>
        </div>
      )}

      {!result.compliance?.length && (
        <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-sm font-semibold text-[var(--accent)]">
          등록 전 체크리스트 통과 · 위험 표현 없음
        </div>
      )}

      <Section
        title="1. 상세 본문 (복붙용)"
        actions={
          <>
            <button
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
              onClick={() =>
                copyText("plain", result.detailPlain || result.detailMarkdown)
              }
            >
              {copied === "plain" ? "복사됨" : "텍스트 복사"}
            </button>
            <button
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
              onClick={() => copyText("html", result.detailHtml)}
            >
              {copied === "html" ? "복사됨" : "HTML 복사"}
            </button>
            <button
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
              onClick={downloadHtml}
            >
              HTML 파일
            </button>
          </>
        }
      >
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7f4ee] p-4 text-sm">
          {result.detailMarkdown}
        </pre>
      </Section>

      <Section
        title={`2. 상품명 후보 (${tpl.titleMaxLen}자)`}
        actions={
          onRegenerate ? (
            <button
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
              disabled={busy}
              onClick={() => onRegenerate("titles")}
            >
              {regeneratingMode === "titles" ? "재생성 중…" : "상품명만 다시"}
            </button>
          ) : null
        }
      >
        <CopyList
          items={result.titleCandidates || []}
          copied={copied}
          onCopy={copyText}
          maxLen={tpl.titleMaxLen}
        />
      </Section>

      <Section
        title={`3. 광고 문구 (${tpl.adMaxLen}자)`}
        actions={
          onRegenerate ? (
            <button
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
              disabled={busy}
              onClick={() => onRegenerate("ads")}
            >
              {regeneratingMode === "ads" ? "재생성 중…" : "광고만 다시"}
            </button>
          ) : null
        }
      >
        <CopyList
          items={result.adCopies}
          copied={copied}
          onCopy={copyText}
          numbered
          maxLen={tpl.adMaxLen}
        />
      </Section>

      <Section title="4. 옵션명">
        <CopyList items={result.optionNames} copied={copied} onCopy={copyText} />
      </Section>

      <Section
        title="5. 검색 키워드"
        actions={
          onRegenerate ? (
            <button
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
              disabled={busy}
              onClick={() => onRegenerate("keywords")}
            >
              {regeneratingMode === "keywords" ? "재생성 중…" : "키워드만 다시"}
            </button>
          ) : null
        }
      >
        <p className="rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm leading-relaxed">
          {(result.searchKeywords || []).join(", ")}
        </p>
        <button
          className="btn btn-ghost mt-2 !px-3 !py-1.5 text-xs"
          onClick={() =>
            copyText("kw", (result.searchKeywords || []).join(", "))
          }
        >
          {copied === "kw" ? "복사됨" : "키워드 복사"}
        </button>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[var(--accent)]">{title}</h3>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {children}
    </section>
  );
}

function CopyList({
  items,
  copied,
  onCopy,
  numbered,
  maxLen,
}: {
  items: string[];
  copied: string;
  onCopy: (label: string, text: string) => void;
  numbered?: boolean;
  maxLen?: number;
}) {
  if (!items?.length) {
    return <p className="text-sm text-[var(--ink-soft)]">항목 없음</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, idx) => {
        const meta = maxLen ? lengthMeta(item, maxLen) : null;
        return (
          <li
            key={`${idx}-${item}`}
            className="flex items-start justify-between gap-3 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
          >
            <span>
              {numbered ? (
                <span className="mr-2 font-bold text-[var(--ink-soft)]">
                  {idx + 1}.
                </span>
              ) : null}
              {item}
              {meta && (
                <span
                  className={`ml-2 text-xs font-bold ${
                    meta.over ? "text-[var(--danger)]" : "text-[var(--ink-soft)]"
                  }`}
                >
                  {meta.label}
                </span>
              )}
            </span>
            <button
              className="shrink-0 text-xs font-bold text-[var(--accent)]"
              onClick={() => onCopy(`${idx}-${item}`, item)}
            >
              {copied === `${idx}-${item}` ? "복사됨" : "복사"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
