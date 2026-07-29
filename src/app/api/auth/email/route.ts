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

type AuthLikeError = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
};

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
        const parsedError = serializeAuthError(error);
        return NextResponse.json(
          {
            error: mapAuthError(parsedError.message),
            code: parsedError.code,
            status: parsedError.status,
          },
          { status: 400 },
        );
      }

      // 이미 가입된 이메일이면 Supabase가 빈 user/identities를 줄 수 있음
      if (
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        return NextResponse.json(
          {
            error:
              "이미 가입된 이메일입니다. 로그인하거나, 인증 메일을 다시 받아 주세요.",
            code: "already_registered",
          },
          { status: 400 },
        );
      }

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
      const parsedError = serializeAuthError(error);
      return NextResponse.json(
        {
          error: mapAuthError(parsedError.message),
          code: parsedError.code,
          status: parsedError.status,
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

function serializeAuthError(error: AuthLikeError) {
  const raw = [error.message, error.code, error.name]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v && v !== "{}");

  const message =
    raw[0] ||
    (error.status
      ? `인증 오류 (HTTP ${error.status})`
      : "인증 처리에 실패했습니다. Gmail SMTP·앱 비밀번호를 다시 확인해 주세요.");

  return {
    message,
    code: error.code && error.code !== "{}" ? error.code : null,
    status: error.status ?? null,
  };
}

function mapAuthError(message: string) {
  const m = message.toLowerCase();
  if (
    m.includes("error sending") ||
    m.includes("confirmation email") ||
    m.includes("smtp") ||
    m.includes("sending email")
  ) {
    return "인증 메일 발송 실패. Supabase SMTP를 확인하세요: Host smtp.gmail.com / Port 465 / Username=Gmail / Password=앱비밀번호(공백없이).";
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
  if (m === "{}" || !m.trim()) {
    return "인증 메일/SMTP 설정 오류로 보입니다. Gmail 앱 비밀번호·Port(465 또는 587)를 다시 저장해 주세요.";
  }
  return message;
}
