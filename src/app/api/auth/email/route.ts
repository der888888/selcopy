import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { DEMO_COOKIE } from "@/lib/auth";
import { demoSignIn, demoSignUp } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/middleware";

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

    if (mode === "signup") {
      // SMTP/인증메일 실패를 피하려고 admin으로 생성 후 바로 로그인
      const admin = createAdminClient();
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        return NextResponse.json(
          {
            error: mapAuthError(
              createError.message ||
                createError.code ||
                "회원가입에 실패했습니다.",
            ),
            code: createError.code ?? null,
          },
          { status: 400 },
        );
      }
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
    return "인증 메일 발송에 실패했습니다. SMTP(Gmail/Resend) 설정을 확인해 주세요.";
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
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (m.includes("email not confirmed")) {
    return "이메일 인증이 아직 안 됐습니다. 받은편지함의 인증 링크를 눌러 주세요.";
  }
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (m.includes("service role")) {
    return "서버 설정(SUPABASE_SERVICE_ROLE_KEY)이 없습니다. Vercel 환경변수를 확인하세요.";
  }
  return message || "요청에 실패했습니다.";
}
