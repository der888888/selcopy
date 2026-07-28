"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/site-header";
import type { UsageSnapshot } from "@/lib/types";

const SAMPLE = `productName,category,keywords,sellingPoints,platform
스테인리스 보온병 500ml,생활/주방,"보온병,캠핑",12시간 보온 가벼운 무게,smartstore
미니 선풍기,디지털,"선풍기,휴대용",저소음 USB충전,coupang
`;

export default function BulkPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [csvText, setCsvText] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
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

  function parseCsv(text: string) {
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

  async function onRun() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const rows = parseCsv(csvText).filter((r) => r.productName);
      if (!rows.length) throw new Error("유효한 행이 없습니다.");
      if (rows.length > 100) throw new Error("한 번에 최대 100행까지입니다.");

      const res = await fetch("/api/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "대량 생성 실패");

      const blob = new Blob(["\uFEFF" + data.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selcopy-bulk-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage(`${data.count}건 처리 완료. CSV를 다운로드했습니다.`);
      const me = await fetch("/api/me");
      if (me.ok) {
        const m = await me.json();
        setUsage(m.usage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setLoading(false);
    }
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
          GPT 채팅으로 상품 100개를 돌리기 어려울 때 씁니다. 행마다 1회 차감되며,
          결과는 CSV로 내려받습니다. 한 번에 최대 100행.
        </p>

        <div className="card mt-6 grid gap-4 p-6">
          <div className="field">
            <label>입력 CSV</label>
            <textarea
              rows={12}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <p className="text-xs text-[var(--ink-soft)]">
            필수 열: productName / 선택: category, keywords, sellingPoints, platform(smartstore|coupang)
          </p>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {message && <p className="text-sm text-[var(--accent)]">{message}</p>}
          <button
            className="btn btn-accent w-fit"
            disabled={loading || !usage?.canGenerate}
            onClick={onRun}
          >
            {loading ? "생성 중… (시간이 걸릴 수 있음)" : "대량 생성 후 CSV 받기"}
          </button>
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
