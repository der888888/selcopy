import { NextResponse } from "next/server";
import { getCurrentUsage } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { getDemoToken } from "@/lib/auth";
import { demoListGenerations, demoUpdateBrandTone } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function GET() {
  const usage = await getCurrentUsage();
  if (!usage) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let generations = [];
  if (isDemoMode()) {
    generations = await demoListGenerations((await getDemoToken())!);
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("generations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    generations = data || [];
  }

  return NextResponse.json({ ...usage, generations });
}

export async function PATCH(request: Request) {
  const schema = z.object({ brandTone: z.string().max(300) });
  const { brandTone } = schema.parse(await request.json());

  if (isDemoMode()) {
    const token = await getDemoToken();
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const profile = await demoUpdateBrandTone(token, brandTone);
    return NextResponse.json({ profile });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ brand_tone: brandTone })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ profile: data });
}
