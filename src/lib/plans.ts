export type PlanId = "free" | "starter" | "pro";

export type ProductCode =
  | "credits_30"
  | "plan_starter"
  | "plan_pro";

export const PLANS = {
  free: {
    id: "free" as const,
    name: "무료",
    priceLabel: "0원",
    price: 0,
    monthlyQuota: 0,
    dailyFree: 1,
    perUse: null as number | null,
    features: [
      "하루 1회 생성 (맛보기)",
      "기본 결과 세트",
      "CSV 대량·부분 재생성 잠금",
    ],
  },
  starter: {
    id: "starter" as const,
    name: "스타터",
    priceLabel: "월 19,900원",
    price: 19900,
    monthlyQuota: 50,
    dailyFree: 0,
    perUse: Math.round(19900 / 50),
    features: [
      "월 50회 · 회당 약 398원",
      "CSV 대량 생성",
      "상품명/광고/키워드만 재생성",
      "검수·복붙 HTML",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "프로",
    priceLabel: "월 49,900원",
    price: 49900,
    monthlyQuota: 200,
    dailyFree: 0,
    perUse: Math.round(49900 / 200),
    features: [
      "월 200회 · 회당 약 250원",
      "스타터 전체 + 브랜드톤",
      "대량·재생성 우선",
      "HTML 상세 내보내기",
    ],
  },
} as const;

export const PRODUCTS: Record<
  ProductCode,
  {
    code: ProductCode;
    name: string;
    amount: number;
    units: number;
    perUse: number;
    description: string;
  }
> = {
  credits_30: {
    code: "credits_30",
    name: "크레딧 30회",
    amount: 14900,
    units: 30,
    perUse: Math.round(14900 / 30),
    description: "단발 생성용 · 회당 약 497원 · 대량/재생성 불가",
  },
  plan_starter: {
    code: "plan_starter",
    name: "스타터 30일",
    amount: 19900,
    units: 50,
    perUse: Math.round(19900 / 50),
    description: "월 50회 · 회당 약 398원 · 대량+재생성 포함",
  },
  plan_pro: {
    code: "plan_pro",
    name: "프로 30일",
    amount: 49900,
    units: 200,
    perUse: Math.round(49900 / 200),
    description: "월 200회 · 회당 약 250원 · 브랜드톤+대량",
  },
};

export function planMonthlyQuota(plan: PlanId): number {
  return PLANS[plan].monthlyQuota;
}

export function isPaidPlan(plan: PlanId) {
  return plan === "starter" || plan === "pro";
}

export function formatWon(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}
