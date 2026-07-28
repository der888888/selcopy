import type { Platform } from "./types";

export type PlatformTemplate = {
  id: Platform;
  label: string;
  titleMaxLen: number;
  adMaxLen: number;
  detailSections: string[];
  toneHints: string[];
  extraRules: string[];
};

export const PLATFORM_TEMPLATES: Record<Platform, PlatformTemplate> = {
  smartstore: {
    id: "smartstore",
    label: "스마트스토어",
    titleMaxLen: 50,
    adMaxLen: 40,
    detailSections: [
      "한줄 소개",
      "이런 분께 추천",
      "핵심 포인트",
      "구성/스펙",
      "사용 장면",
      "구매 전 안내",
    ],
    toneHints: [
      "검색 키워드를 자연스럽게 녹일 것",
      "모바일에서 읽기 쉬운 짧은 문단",
      "후기·재구매를 유도하는 담백한 톤",
    ],
    extraRules: [
      "상품명 후보에 브랜드+속성+키워드 조합 사용",
      "광고 문구는 파워클릭/쇼핑 소재에 붙이기 좋게",
    ],
  },
  coupang: {
    id: "coupang",
    label: "쿠팡",
    titleMaxLen: 100,
    adMaxLen: 35,
    detailSections: [
      "한줄 소개",
      "왜 이 상품인가",
      "핵심 포인트",
      "구성/스펙",
      "배송·사용 팁",
      "자주 묻는 점",
    ],
    toneHints: [
      "비교·선택 기준을 명확히",
      "로켓배송/빠른 수령 경험을 과장 없이 언급 가능",
      "스펙 숫자를 앞에 두기",
    ],
    extraRules: [
      "상품명 후보는 검색형(속성 나열) 위주",
      "광고 문구는 짧고 혜택/용도 중심",
    ],
  },
};

export function getPlatformTemplate(platform: Platform) {
  return PLATFORM_TEMPLATES[platform];
}
