import { PRODUCTS, type ProductCode } from "./plans";
import { appUrl, hasToss } from "./env";

export function assertTossConfigured() {
  if (!hasToss()) {
    throw new Error("토스 결제 키가 설정되지 않았습니다.");
  }
}

export async function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  assertTossConfigured();
  const secret = process.env.TOSS_SECRET_KEY!;
  const encrypted = Buffer.from(`${secret}:`).toString("base64");

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${encrypted}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "결제 승인에 실패했습니다.");
  }
  return data;
}

export function getProduct(code: string) {
  if (!(code in PRODUCTS)) return null;
  return PRODUCTS[code as ProductCode];
}

export function paymentSuccessUrl() {
  return `${appUrl()}/billing/success`;
}

export function paymentFailUrl() {
  return `${appUrl()}/billing/fail`;
}
