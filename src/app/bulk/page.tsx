"use client";

import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/site-header";
import type { Platform, UsageSnapshot } from "@/lib/types";

const TEMPLATE = `productName,category,keywords,sellingPoints,platform
스테인리스 보온병 500ml,생활/주방,"보온병,캠핑",12시간 보온 가벼운 무게,smartstore
미니 선풍기,디지털,"선풍기,휴대용",저소음 USB충전,coupang
`;

type BulkRow = {
  productName: string;
  category: string;
  keywords: string;
  sellingPoints: string;
  platform: Platform;
};

type RowResult = {
  row: BulkRow;
  status: "pending" | "running" | "done" | "error";
  error?: string;
  detailMarkdown?: string;
  titleCandidates?: string;
  adCopies?: string;
  optionNames?: string;
  searchKeywords?: string;
  compliance?: string;
};

export default function BulkPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [csvText, setCsvText] = useState(TEMPLATE);
  const [rows, setRows] = useState<RowResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

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
    })();
  }, []);

  const progress = useMemo(() => {
    if (!rows.length) return { done: 0, total: 0, failed: 0 };
    return {
      done: rows.filter((r) => r.status === "done").length,
      total: rows.length,
      failed: rows.filter((r) => r.status === "error").length,
    };
  }, [rows]);

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF" + TEMPLATE], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "selcopy-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCsv(text: string): BulkRow[] {
    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) throw new Error("헤더 + 데이터 행이 필요합니다.");

    const headers = splitCsvLine(lines[0]).map((h) => h.trim());
    const idx = {
      productName: headers.indexOf("productName"),
      category: headers.indexOf("category"),
      keywords: headers.indexOf("keywords"),
      sellingPoints: headers.indexOf("sellingPoints"),
      platform: headers.indexOf("platform"),
    };
    if (idx.productName < 0) throw new Error("productName 열이 필요합니다.");

    return lines.slice(1).map((line) => {
      const cols = splitCsvLine(line);
      const platformRaw = (cols[idx.platform] || "smartstore").trim();
      return {
        productName: cols[idx.productName]?.trim() || "",
        category: cols[idx.category]?.trim() || "",
        keywords: cols[idx.keywords]?.trim() || "",
        sellingPoints: cols[idx.sellingPoints]?.trim() || "",
        platform:
          platformRaw === "coupang" ? ("coupang" as const) : ("smartstore" as const),
      };
    });
  }

  async function processIndices(indices: number[], base: RowResult[]) {
    setRunning(true);
    setError("");
    let working = [...base];

    for (const i of indices) {
      working = working.map((r, idx) =>
        idx === i ? { ...r, status: "running", error: undefined } : r,
      );
      setRows(working);

      const item = working[i];
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...item.row,
            mode: "full",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "생성 실패");

        working = working.map((r, idx) =>
          idx === i
            ? {
                ...r,
                status: "done",
                detailMarkdown: data.result.detailMarkdown,
                titleCandidates: (data.result.titleCandidates || []).join(" | "),
                adCopies: (data.result.adCopies || []).join(" | "),
                optionNames: (data.result.optionNames || []).join(" | "),
                searchKeywords: (data.result.searchKeywords || []).join(", "),
                compliance: (data.result.compliance || [])
                  .map(
                    (c: { term: string; suggestion: string }) =>
                      `${c.term}:${c.suggestion}`,
                  )
                  .join(" / "),
              }
            : r,
        );
        setRows(working);
        if (data.usage) setUsage(data.usage);
      } catch (err) {
        working = working.map((r, idx) =>
          idx === i
            ? {
                ...r,
                status: "error",
                error: err instanceof Error ? err.message : "실패",
              }
            : r,
        );
        setRows(working);
        if (
          err instanceof Error &&
          (err.message.includes("한도") || err.message.includes("QUOTA"))
        ) {
          setError("한도 부족으로 중단되었습니다.");
          break;
        }
      }
    }

    setRunning(false);
    const me = await fetch("/api/me");
    if (me.ok) {
      const m = await me.json();
      setUsage(m.usage);
    }
  }

  async function onRun() {
    try {
      const parsed = parseCsv(csvText).filter((r) => r.productName);
      if (!parsed.length) throw new Error("유효한 행이 없습니다.");
      if (parsed.length > 100) throw new Error("한 번에 최대 100행까지입니다.");
      const initial: RowResult[] = parsed.map((row) => ({
        row,
        status: "pending",
      }));
      setRows(initial);
      await processIndices(
        initial.map((_, i) => i),
        initial,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    }
  }

  async function onRetryFailed() {
    const failedIdx = rows
      .map((r, i) => (r.status === "error" ? i : -1))
      .filter((i) => i >= 0);
    if (!failedIdx.length) return;
    await processIndices(failedIdx, rows);
  }

  function downloadResults() {
    const header = [
      "productName",
      "platform",
      "status",
      "titleCandidates",
      "adCopies",
      "optionNames",
      "searchKeywords",
      "detailMarkdown",
      "compliance",
      "error",
    ];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.row.productName,
          r.row.platform,
          r.status,
          r.titleCandidates || "",
          r.adCopies || "",
          r.optionNames || "",
          r.searchKeywords || "",
          r.detailMarkdown || "",
          r.compliance || "",
          r.error || "",
        ]
          .map(escapeCsv)
          .join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selcopy-bulk-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <AppNav
        email={email}
        usageLabel={usage ? `${usage.plan} · 크레딧 ${usage.credits}` : undefined}
      />
      <section className="container py-8">
        <h1 className="display text-3xl font-extrabold">대량 생성 (CSV)</h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-soft)]">
          행마다 진행률이 보이고, 실패한 행만 다시 돌릴 수 있습니다. 최대 100행.
        </p>

        <div className="card mt-6 grid gap-4 p-6">
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost !py-2 !px-4 text-sm" onClick={downloadTemplate}>
              템플릿 CSV 받기
            </button>
            {rows.length > 0 && (
              <button className="btn btn-ghost !py-2 !px-4 text-sm" onClick={downloadResults}>
                결과 CSV 받기
              </button>
            )}
          </div>

          <div className="field">
            <label>입력 CSV</label>
            <textarea
              rows={10}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="font-mono text-sm"
              disabled={running}
            />
          </div>

          {rows.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>
                  진행 {progress.done}/{progress.total}
                  {progress.failed > 0 ? ` · 실패 ${progress.failed}` : ""}
                </span>
                <span className="text-[var(--ink-soft)]">
                  {Math.round(
                    ((progress.done + progress.failed) / Math.max(progress.total, 1)) *
                      100,
                  )}
                  %
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
                <div
                  className="h-full bg-[var(--accent)] transition-all"
                  style={{
                    width: `${
                      ((progress.done + progress.failed) /
                        Math.max(progress.total, 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
              <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-sm">
                {rows.map((r, i) => (
                  <li key={`${r.row.productName}-${i}`} className="flex gap-2">
                    <span className="w-16 shrink-0 font-bold text-[var(--ink-soft)]">
                      {r.status === "done"
                        ? "완료"
                        : r.status === "error"
                          ? "실패"
                          : r.status === "running"
                            ? "진행"
                            : "대기"}
                    </span>
                    <span className="truncate">{r.row.productName}</span>
                    {r.error && (
                      <span className="truncate text-[var(--danger)]">{r.error}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-accent"
              disabled={running || !usage?.canGenerate}
              onClick={onRun}
            >
              {running ? "생성 중…" : "대량 생성 시작"}
            </button>
            {progress.failed > 0 && (
              <button
                className="btn btn-primary"
                disabled={running || !usage?.canGenerate}
                onClick={onRetryFailed}
              >
                실패 {progress.failed}건만 다시
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function escapeCsv(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}
