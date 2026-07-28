import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";

export async function POST() {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: "데모 모드에서는 이메일 로그인을 사용하세요." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: `${appUrl()}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return NextResponse.json(
      { error: error?.message || "카카오 로그인 설정이 필요합니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({ url: data.url });
}
