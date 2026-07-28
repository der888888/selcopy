import Link from "next/link";
import { LogoutButton } from "./logout-button";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="container flex items-center justify-between py-5">
      <Link href="/" className="display text-2xl font-extrabold tracking-tight">
        셀카피
      </Link>
      <nav className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-soft)]">
        {!compact && (
          <>
            <Link href="/pricing" className="px-3 py-2 hover:text-[var(--ink)]">
              요금제
            </Link>
            <Link href="/login" className="btn btn-ghost !py-2 !px-4">
              로그인
            </Link>
          </>
        )}
        <Link href="/generate" className="btn btn-primary !py-2 !px-4">
          시작하기
        </Link>
      </nav>
    </header>
  );
}

export function AppNav({
  email,
  usageLabel,
}: {
  email?: string | null;
  usageLabel?: string;
}) {
  return (
    <header className="border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elevated)_80%,transparent)] backdrop-blur">
      <div className="container flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-5">
          <Link href="/" className="display text-xl font-extrabold">
            셀카피
          </Link>
          <nav className="flex gap-1 text-sm font-semibold">
            <Link href="/generate" className="rounded-full px-3 py-2 hover:bg-white/70">
              생성
            </Link>
            <Link href="/history" className="rounded-full px-3 py-2 hover:bg-white/70">
              이력
            </Link>
            <Link href="/billing" className="rounded-full px-3 py-2 hover:bg-white/70">
              결제
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {usageLabel && <span className="badge">{usageLabel}</span>}
          <span className="text-[var(--ink-soft)]">{email}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
