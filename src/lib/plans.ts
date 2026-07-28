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
    features: [
      "하루 1회 생성",
      "길이·완성도 제한",
      "워터마크 문구 포함",
    ],
  },
  starter: {
    id: "starter" as const,
    name: "스타터",
    priceLabel: "월 19,900원",
    price: 19900,
    monthlyQuota: 50,
    dailyFree: 0,
    features: [
      "월 50회 생성",
      "상세·광고·키워드 풀세트",
      "생성 이력 저장",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "프로",
    priceLabel: "월 49,900원",
    price: 49900,
    monthlyQuota: 200,
    dailyFree: 0,
    features: [
      "월 200회 생성",
      "브랜드톤 저장",
      "HTML 상세 내보내기",
      "우선 생성 품질",
    ],
  },
} as const;

export const PRODUCTS: Record<
  ProductCode,
  {
    code: ProductCode;
    name: string;
    amount: number;
    description: string;
  }
> = {
  credits_30: {
    code: "credits_30",
    name: "크레딧 30회",
    amount: 9900,
    description: "구독 없이 30회 생성",
  },
  plan_starter: {
    code: "plan_starter",
    name: "스타터 30일",
    amount: 19900,
    description: "30일간 월 50회 쿼터",
  },
  plan_pro: {
    code: "plan_pro",
    name: "프로 30일",
    amount: 49900,
    description: "30일간 월 200회 + HTML·브랜드톤",
  },
};

export function planMonthlyQuota(plan: PlanId): number {
  return PLANS[plan].monthlyQuota;
}
