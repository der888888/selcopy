import { PLANS, planMonthlyQuota, type PlanId } from "./plans";
import type { Profile, UsageSnapshot } from "./types";

function todayKST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function normalizeProfile(profile: Profile): Profile {
  const resetAt = new Date(profile.monthly_reset_at);
  const now = new Date();
  const monthChanged =
    resetAt.getUTCFullYear() !== now.getUTCFullYear() ||
    resetAt.getUTCMonth() !== now.getUTCMonth();

  let plan = profile.plan;
  if (
    plan !== "free" &&
    profile.plan_expires_at &&
    new Date(profile.plan_expires_at) < now
  ) {
    plan = "free";
  }

  return {
    ...profile,
    plan,
    monthly_used: monthChanged ? 0 : profile.monthly_used,
    monthly_reset_at: monthChanged ? now.toISOString() : profile.monthly_reset_at,
    free_used_count:
      profile.free_used_date === todayKST() ? profile.free_used_count : 0,
    free_used_date:
      profile.free_used_date === todayKST() ? profile.free_used_date : null,
  };
}

export function getUsageSnapshot(profile: Profile): UsageSnapshot {
  const p = normalizeProfile(profile);
  const monthlyQuota = planMonthlyQuota(p.plan);
  const freeRemainingToday = Math.max(
    0,
    PLANS.free.dailyFree - p.free_used_count,
  );

  const hasPlanQuota = monthlyQuota > 0 && p.monthly_used < monthlyQuota;
  const hasCredits = p.credits > 0;
  const hasFree = p.plan === "free" && freeRemainingToday > 0;

  return {
    plan: p.plan,
    credits: p.credits,
    monthlyUsed: p.monthly_used,
    monthlyQuota,
    freeRemainingToday,
    canGenerate: hasPlanQuota || hasCredits || hasFree,
    brandTone: p.brand_tone,
    planExpiresAt: p.plan_expires_at,
  };
}

export type ConsumeKind = "plan" | "credit" | "free";

export function decideConsume(profile: Profile): ConsumeKind | null {
  const p = normalizeProfile(profile);
  const monthlyQuota = planMonthlyQuota(p.plan);
  if (monthlyQuota > 0 && p.monthly_used < monthlyQuota) return "plan";
  if (p.credits > 0) return "credit";
  if (p.plan === "free" && p.free_used_count < PLANS.free.dailyFree) return "free";
  return null;
}

export function applyConsume(
  profile: Profile,
  kind: ConsumeKind,
): Partial<Profile> {
  const p = normalizeProfile(profile);
  if (kind === "plan") {
    return {
      monthly_used: p.monthly_used + 1,
      monthly_reset_at: p.monthly_reset_at,
    };
  }
  if (kind === "credit") {
    return { credits: Math.max(0, p.credits - 1) };
  }
  return {
    free_used_date: todayKST(),
    free_used_count: p.free_used_count + 1,
  };
}

export function applyPurchase(
  profile: Profile,
  productCode: "credits_30" | "plan_starter" | "plan_pro",
): Partial<Profile> {
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);

  if (productCode === "credits_30") {
    return { credits: profile.credits + 30 };
  }
  if (productCode === "plan_starter") {
    return {
      plan: "starter" satisfies PlanId,
      plan_expires_at: expires.toISOString(),
      monthly_used: 0,
      monthly_reset_at: new Date().toISOString(),
    };
  }
  return {
    plan: "pro" satisfies PlanId,
    plan_expires_at: expires.toISOString(),
    monthly_used: 0,
    monthly_reset_at: new Date().toISOString(),
  };
}
