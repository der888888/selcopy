import type { PlanId } from "./plans";

export type Platform = "smartstore" | "coupang";

export type GenerateMode =
  | "full"
  | "ads"
  | "titles"
  | "keywords"
  | "ads_keywords";

export type GenerateInput = {
  platform: Platform;
  productName: string;
  category: string;
  keywords: string;
  sellingPoints: string;
  imageNote?: string;
  brandTone?: string;
};

export type ComplianceIssue = {
  term: string;
  severity: "warn" | "high";
  suggestion: string;
  locations: string[];
};

export type GenerateResult = {
  detailMarkdown: string;
  detailHtml: string;
  detailPlain?: string;
  titleCandidates: string[];
  adCopies: string[];
  optionNames: string[];
  searchKeywords: string[];
  compliance: ComplianceIssue[];
  watermarked: boolean;
};

export type Profile = {
  id: string;
  email: string | null;
  plan: PlanId;
  plan_expires_at: string | null;
  credits: number;
  monthly_used: number;
  monthly_reset_at: string;
  free_used_date: string | null;
  free_used_count: number;
  brand_tone: string | null;
};

export type GenerationRow = {
  id: string;
  user_id: string | null;
  platform: Platform;
  product_name: string;
  category: string | null;
  keywords: string | null;
  selling_points: string | null;
  result: GenerateResult;
  is_free: boolean;
  created_at: string;
};

export type UsageSnapshot = {
  plan: PlanId;
  credits: number;
  monthlyUsed: number;
  monthlyQuota: number;
  freeRemainingToday: number;
  canGenerate: boolean;
  canBulk: boolean;
  canPartialRegenerate: boolean;
  brandTone: string | null;
  planExpiresAt: string | null;
};
