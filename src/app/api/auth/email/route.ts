import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { DEMO_COOKIE } from "@/lib/auth";
import { demoSignIn, demoSignUp } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  mode: z.enum(["signin", "signup"]).default("signin"),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인하세요." }, { status: 400 });
  }

  const { email, password, mode } = parsed.data;

  if (isDemoMode()) {
    const result =
      mode === "signup"
        ? await demoSignUp(email, password)
        : await demoSignIn(email, password);

    const res = NextResponse.json({
      ok: true,
      demo: true,
      profile: result.profile,
    });
    res.cookies.set(DEMO_COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  const supabase = await createClient();
  if (mode === "signup") {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true, demo: false });
}
