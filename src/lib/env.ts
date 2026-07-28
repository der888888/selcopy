export function isDemoMode() {
  return process.env.DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function hasToss() {
  return Boolean(
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY && process.env.TOSS_SECRET_KEY,
  );
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function appName() {
  return process.env.NEXT_PUBLIC_APP_NAME ?? "셀카피";
}
