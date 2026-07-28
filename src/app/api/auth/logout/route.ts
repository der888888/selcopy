import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/env";
import { DEMO_COOKIE } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  if (isDemoMode()) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(DEMO_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
