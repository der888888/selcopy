"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SuccessInner() {
  const params = useSearchParams();
  const [message, setMessage] = useState("결제 확인 중…");

  useEffect(() => {
    (async () => {
      const paymentKey = params.get("paymentKey");
      const orderId = params.get("orderId");
      const amount = Number(params.get("amount"));
      const productCode = params.get("productCode");

      if (!paymentKey || !orderId || !amount || !productCode) {
        setMessage("결제 정보가 부족합니다.");
        return;
      }

      const res = await fetch("/api/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentKey, orderId, amount, productCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "결제 승인 실패");
        return;
      }
      setMessage("결제가 완료되었습니다. 한도가 반영되었습니다.");
    })();
  }, [params]);

  return (
    <main className="container py-20">
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="display text-3xl font-extrabold">결제 성공</h1>
        <p className="mt-3 text-[var(--ink-soft)]">{message}</p>
        <Link href="/billing" className="btn btn-primary mt-6">
          결제 페이지로
        </Link>
      </div>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
