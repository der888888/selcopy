import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { applyConsume, applyPurchase, decideConsume, getUsageSnapshot, normalizeProfile } from "./credits";
import type { GenerateInput, GenerateResult, GenerationRow, Profile } from "./types";
import type { ProductCode } from "./plans";

type DemoStore = {
  profiles: Record<string, Profile>;
  generations: GenerationRow[];
  payments: {
    id: string;
    user_id: string;
    order_id: string;
    product_code: string;
    amount: number;
    status: string;
  }[];
  sessions: Record<string, string>; // token -> userId
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "demo-store.json");

const defaultStore = (): DemoStore => ({
  profiles: {},
  generations: [],
  payments: [],
  sessions: {},
});

async function readStore(): Promise<DemoStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return { ...defaultStore(), ...JSON.parse(raw) } as DemoStore;
  } catch {
    return defaultStore();
  }
}

async function writeStore(store: DemoStore) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function demoSignUp(email: string, password: string) {
  const store = await readStore();
  const existing = Object.values(store.profiles).find((p) => p.email === email);
  if (existing) {
    // password ignored in demo — login same email
    const token = randomUUID();
    store.sessions[token] = existing.id;
    await writeStore(store);
    return { token, profile: normalizeProfile(existing) };
  }

  const id = randomUUID();
  const profile: Profile = {
    id,
    email,
    plan: "free",
    plan_expires_at: null,
    credits: 3,
    monthly_used: 0,
    monthly_reset_at: new Date().toISOString(),
    free_used_date: null,
    free_used_count: 0,
    brand_tone: null,
  };
  store.profiles[id] = profile;
  const token = randomUUID();
  store.sessions[token] = id;
  // stash password hash lightly for demo uniqueness check
  (store as DemoStore & { passwords?: Record<string, string> }).passwords = {
    ...((store as DemoStore & { passwords?: Record<string, string> }).passwords ||
      {}),
    [email]: password,
  };
  await writeStore(store);
  return { token, profile };
}

export async function demoSignIn(email: string, _password: string) {
  const store = await readStore();
  let profile = Object.values(store.profiles).find((p) => p.email === email);
  if (!profile) {
    return demoSignUp(email, _password);
  }
  const token = randomUUID();
  store.sessions[token] = profile.id;
  await writeStore(store);
  return { token, profile: normalizeProfile(profile) };
}

export async function demoGetProfile(token: string | undefined) {
  if (!token) return null;
  const store = await readStore();
  const userId = store.sessions[token];
  if (!userId) return null;
  const profile = store.profiles[userId];
  if (!profile) return null;
  return normalizeProfile(profile);
}

export async function demoUpdateBrandTone(token: string, brandTone: string) {
  const store = await readStore();
  const userId = store.sessions[token];
  if (!userId || !store.profiles[userId]) throw new Error("로그인이 필요합니다.");
  store.profiles[userId].brand_tone = brandTone;
  await writeStore(store);
  return normalizeProfile(store.profiles[userId]);
}

export async function demoConsumeAndSave(params: {
  token: string;
  input: GenerateInput;
  result: GenerateResult;
  limited: boolean;
}) {
  const store = await readStore();
  const userId = store.sessions[params.token];
  if (!userId || !store.profiles[userId]) throw new Error("로그인이 필요합니다.");

  const profile = normalizeProfile(store.profiles[userId]);
  const kind = decideConsume(profile);
  if (!kind) {
    throw new Error("생성 한도가 부족합니다. 요금제 또는 크레딧을 구매하세요.");
  }

  const patch = applyConsume(profile, kind);
  store.profiles[userId] = { ...profile, ...patch };

  const row: GenerationRow = {
    id: randomUUID(),
    user_id: userId,
    platform: params.input.platform,
    product_name: params.input.productName,
    category: params.input.category,
    keywords: params.input.keywords,
    selling_points: params.input.sellingPoints,
    result: params.result,
    is_free: kind === "free",
    created_at: new Date().toISOString(),
  };
  store.generations.unshift(row);
  await writeStore(store);

  return {
    profile: normalizeProfile(store.profiles[userId]),
    usage: getUsageSnapshot(store.profiles[userId]),
    generation: row,
  };
}

export async function demoListGenerations(token: string) {
  const store = await readStore();
  const userId = store.sessions[token];
  if (!userId) return [];
  return store.generations.filter((g) => g.user_id === userId);
}

export async function demoCreatePayment(params: {
  token: string;
  orderId: string;
  productCode: ProductCode;
  amount: number;
}) {
  const store = await readStore();
  const userId = store.sessions[params.token];
  if (!userId) throw new Error("로그인이 필요합니다.");
  store.payments.push({
    id: randomUUID(),
    user_id: userId,
    order_id: params.orderId,
    product_code: params.productCode,
    amount: params.amount,
    status: "pending",
  });
  await writeStore(store);
}

export async function demoConfirmPayment(params: {
  token: string;
  orderId: string;
  productCode: ProductCode;
}) {
  const store = await readStore();
  const userId = store.sessions[params.token];
  if (!userId || !store.profiles[userId]) throw new Error("로그인이 필요합니다.");

  const payment = store.payments.find((p) => p.order_id === params.orderId);
  if (payment) payment.status = "paid";

  const patch = applyPurchase(store.profiles[userId], params.productCode);
  store.profiles[userId] = { ...store.profiles[userId], ...patch };
  await writeStore(store);
  return normalizeProfile(store.profiles[userId]);
}

export async function demoUsage(token: string) {
  const profile = await demoGetProfile(token);
  if (!profile) return null;
  return { profile, usage: getUsageSnapshot(profile) };
}

export async function demoGetGeneration(token: string, id: string) {
  const store = await readStore();
  const userId = store.sessions[token];
  if (!userId) return null;
  return (
    store.generations.find((g) => g.id === id && g.user_id === userId) || null
  );
}

export async function demoUpdateGenerationPartial(params: {
  token: string;
  id: string;
  result: GenerateResult;
}) {
  const store = await readStore();
  const userId = store.sessions[params.token];
  if (!userId || !store.profiles[userId]) throw new Error("로그인이 필요합니다.");

  const profile = normalizeProfile(store.profiles[userId]);
  const kind = decideConsume(profile);
  if (!kind) {
    throw new Error("생성 한도가 부족합니다. 요금제 또는 크레딧을 구매하세요.");
  }

  const idx = store.generations.findIndex(
    (g) => g.id === params.id && g.user_id === userId,
  );
  if (idx < 0) throw new Error("이력을 찾을 수 없습니다.");

  store.profiles[userId] = { ...profile, ...applyConsume(profile, kind) };
  store.generations[idx] = {
    ...store.generations[idx],
    result: params.result,
  };
  await writeStore(store);

  return {
    profile: normalizeProfile(store.profiles[userId]),
    usage: getUsageSnapshot(store.profiles[userId]),
    generation: store.generations[idx],
  };
}

export async function demoSaveGenerationResult(params: {
  token: string;
  id: string;
  result: GenerateResult;
}) {
  const store = await readStore();
  const userId = store.sessions[params.token];
  if (!userId) throw new Error("로그인이 필요합니다.");
  const idx = store.generations.findIndex(
    (g) => g.id === params.id && g.user_id === userId,
  );
  if (idx < 0) throw new Error("이력을 찾을 수 없습니다.");
  store.generations[idx] = {
    ...store.generations[idx],
    result: params.result,
  };
  await writeStore(store);
  return { generation: store.generations[idx] };
}
