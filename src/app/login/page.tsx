"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

function formatApiError(error: unknown, status: number) {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return `요청에 실패했습니다 (${status}). 잠시 후 다시 시도해 주세요.`;
}

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode }),
      });
      let data: { error?: unknown; needsEmailConfirm?: boolean; ok?: boolean } =
        {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`서버 응답을 읽을 수 없습니다 (${res.status})`);
      }
      if (!res.ok) {
        throw new Error(formatApiError(data.error, res.status));
      }
      if (mode === "signup" && data.needsEmailConfirm) {
        setInfo(
          "가입 메일을 보냈어요. 받은편지함(스팸함)에서 인증 링크를 눌러 주세요.",
        );
        setMode("signin");
        return;
      }
      window.location.href = "/generate";
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  async function onKakao() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/kakao", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "카카오 로그인 불가");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
      setLoading(false);
    }
  }

  return (
    <main>
      <SiteHeader compact />
      <section className="container flex justify-center py-16">
        <div className="card w-full max-w-md p-8">
          <h1 className="display text-3xl font-extrabold">
            {mode === "signin" ? "로그인" : "회원가입"}
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            이메일로 가입·로그인하거나 카카오를 사용할 수 있습니다.
          </p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div className="field">
              <label>이메일</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label>비밀번호</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            {info && <p className="text-sm text-[var(--accent)]">{info}</p>}
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "처리 중…" : mode === "signin" ? "이메일로 계속" : "가입하기"}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-ghost mt-3 w-full"
            disabled={loading}
            onClick={onKakao}
          >
            카카오로 계속
          </button>

          <p className="mt-6 text-center text-sm text-[var(--ink-soft)]">
            {mode === "signin" ? (
              <>
                계정이 없나요?{" "}
                <button
                  type="button"
                  className="font-bold text-[var(--accent)]"
                  onClick={() => setMode("signup")}
                >
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있나요?{" "}
                <button
                  type="button"
                  className="font-bold text-[var(--accent)]"
                  onClick={() => setMode("signin")}
                >
                  로그인
                </button>
              </>
            )}
          </p>

          <p className="mt-4 text-center text-xs text-[var(--ink-soft)]">
            <Link href="/">홈으로</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
