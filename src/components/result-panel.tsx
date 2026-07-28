"use client";

import { useState } from "react";
import type { GenerateResult } from "@/lib/types";

export function ResultPanel({
  result,
  productName,
  onRegenerateAds,
  regenerating,
}: {
  result: GenerateResult;
  productName?: string;
  onRegenerateAds?: () => void;
  regenerating?: boolean;
}) {
  const [copied, setCopied] = useState("");

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

  return (
    <div className="space-y-6">
      {result.compliance?.length > 0 && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--accent-2)_45%,var(--line))] bg-[#fff8ef] p-4">
          <h3 className="text-sm font-bold text-[var(--accent-2)]">
            금지어·과장 표현 점검
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-[var(--ink-soft)]">
            {result.compliance.map((issue) => (
              <li key={`${issue.term}-${issue.locations.join(",")}`}>
                <strong className="text-[var(--ink)]">{issue.term}</strong>
                {" · "}
                {issue.suggestion}
                {" ("}
                {issue.locations.join(", ")}
                {")"}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--ink-soft)]">
            생성 시 일부 표현은 자동 순화됩니다. 최종 검수는 판매자 책임입니다.
          </p>
        </div>
      )}

      <Section
        title="1. 상세 본문"
        actions={
          <>
            <button
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
              onClick={() => copyText("md", result.detailMarkdown)}
            >
              {copied === "md" ? "복사됨" : "본문 복사"}
            </button>
            <button
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
              onClick={downloadHtml}
            >
              HTML
            </button>
          </>
        }
      >
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f7f4ee] p-4 text-sm">
          {result.detailMarkdown}
        </pre>
      </Section>

      <Section title="2. 상품명 후보">
        <CopyList
          items={result.titleCandidates || []}
          copied={copied}
          onCopy={copyText}
        />
      </Section>

      <Section
        title="3. 광고 문구 10칸"
        actions={
          onRegenerateAds ? (
            <button
              className="btn btn-ghost !px-3 !py-1.5 text-xs"
              disabled={regenerating}
              onClick={onRegenerateAds}
            >
              {regenerating ? "재생성 중…" : "광고·키워드만 다시"}
            </button>
          ) : null
        }
      >
        <CopyList items={result.adCopies} copied={copied} onCopy={copyText} numbered />
      </Section>

      <Section title="4. 옵션명">
        <CopyList items={result.optionNames} copied={copied} onCopy={copyText} />
      </Section>

      <Section title="5. 검색 키워드">
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
}: {
  items: string[];
  copied: string;
  onCopy: (label: string, text: string) => void;
  numbered?: boolean;
}) {
  if (!items?.length) {
    return <p className="text-sm text-[var(--ink-soft)]">항목 없음</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, idx) => (
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
          </span>
          <button
            className="shrink-0 text-xs font-bold text-[var(--accent)]"
            onClick={() => onCopy(`${idx}-${item}`, item)}
          >
            {copied === `${idx}-${item}` ? "복사됨" : "복사"}
          </button>
        </li>
      ))}
    </ul>
  );
}
