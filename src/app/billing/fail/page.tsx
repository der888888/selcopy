import Link from "next/link";

export default function BillingFailPage() {
  return (
    <main className="container py-20">
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="display text-3xl font-extrabold">결제 실패</h1>
        <p className="mt-3 text-[var(--ink-soft)]">
          결제가 취소되었거나 실패했습니다. 다시 시도해 주세요.
        </p>
        <Link href="/billing" className="btn btn-primary mt-6">
          결제 페이지로
        </Link>
      </div>
    </main>
  );
}
