import { cookies } from "next/headers";
import { isDemoMode } from "./env";
import { demoGetProfile, demoUsage } from "./demo-store";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/middleware";
import {
  applyConsume,
  decideConsume,
  getUsageSnapshot,
  normalizeProfile,
} from "./credits";
import type { GenerateInput, GenerateResult, Profile } from "./types";

export const DEMO_COOKIE = "selcopy_demo_token";

export async function getDemoToken() {
  const jar = await cookies();
  return jar.get(DEMO_COOKIE)?.value;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (isDemoMode()) {
    return demoGetProfile(await getDemoToken());
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) return null;
  return normalizeProfile(data as Profile);
}

export async function getCurrentUsage() {
  if (isDemoMode()) {
    const token = await getDemoToken();
    if (!token) return null;
    return demoUsage(token);
  }
  const profile = await getCurrentProfile();
  if (!profile) return null;
  return { profile, usage: getUsageSnapshot(profile) };
}

export async function consumeAndSaveGeneration(params: {
  input: GenerateInput;
  result: GenerateResult;
}) {
  if (isDemoMode()) {
    const { demoConsumeAndSave } = await import("./demo-store");
    return demoConsumeAndSave({
      token: (await getDemoToken())!,
      input: params.input,
      result: params.result,
      limited: false,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const admin = createAdminClient();
  const { data: rawProfile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !rawProfile) throw new Error("프로필을 찾을 수 없습니다.");

  const profile = normalizeProfile(rawProfile as Profile);
  const kind = decideConsume(profile);
  if (!kind) {
    throw new Error("생성 한도가 부족합니다. 요금제 또는 크레딧을 구매하세요.");
  }

  const patch = applyConsume(profile, kind);
  await admin.from("profiles").update(patch).eq("id", user.id);

  const { data: generation, error: genError } = await admin
    .from("generations")
    .insert({
      user_id: user.id,
      platform: params.input.platform,
      product_name: params.input.productName,
      category: params.input.category,
      keywords: params.input.keywords,
      selling_points: params.input.sellingPoints,
      image_note: params.input.imageNote,
      result: params.result,
      is_free: kind === "free",
    })
    .select("*")
    .single();

  if (genError) throw new Error(genError.message);

  const { data: updated } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const nextProfile = normalizeProfile(updated as Profile);
  return {
    profile: nextProfile,
    usage: getUsageSnapshot(nextProfile),
    generation,
  };
}
