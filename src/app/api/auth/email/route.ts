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
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "이메일·비밀번호(6자 이상)를 확인해 주세요." },
        { status: 400 },
      );
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
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      "https://selcopy.vercel.app";

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
        },
      });
      if (error) {
        return NextResponse.json(
          {
            error: mapAuthError(
              error.message || error.code || "회원가입에 실패했습니다.",
            ),
            code: error.code ?? null,
          },
          { status: 400 },
        );
      }

      // 세션이 없으면 이메일 인증 대기 (로그인 시키지 않음)
      if (!data.session) {
        return NextResponse.json({
          ok: true,
          demo: false,
          needsEmailConfirm: true,
        });
      }

      return NextResponse.json({ ok: true, demo: false });
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return NextResponse.json(
        {
          error: mapAuthError(
            error.message || error.code || "로그인에 실패했습니다.",
          ),
          code: error.code ?? null,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, demo: false });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mapAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("error sending") || m.includes("confirmation email")) {
    return "인증 메일 발송에 실패했습니다. Supabase SMTP(Gmail 앱 비밀번호) 설정을 확인해 주세요.";
  }
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("already exists") ||
    m.includes("user already")
  ) {
    return "이미 가입된 이메일입니다. 로그인으로 시도해 주세요.";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다. 아직 인증 메일을 안 눌렀다면 받은편지함을 확인해 주세요.";
  }
  if (m.includes("email not confirmed")) {
    return "이메일 인증이 아직 안 됐습니다. 받은편지함의 인증 링크를 눌러 주세요.";
  }
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  return message || "요청에 실패했습니다.";
}
