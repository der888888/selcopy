# 셀카피 (Selcopy)

스마트스토어·쿠팡 셀러용 AI 상세페이지/광고 카피 생성 웹 SaaS MVP.

## 스택

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (인증/DB) — 없으면 **DEMO_MODE**로 로컬 동작
- OpenAI — 없으면 목(mock) 생성
- 토스페이먼츠 — 없으면 데모 즉시 결제

## 빠른 시작 (데모)

```bash
cp .env.example .env.local
npm install
npm run dev
```

브라우저에서 http://localhost:3000

1. 랜딩에서 미리보기 생성
2. `/login` → 아무 이메일/비밀번호로 로그인 (데모)
3. `/generate`에서 생성 (가입 시 크레딧 3회 + 하루 1회 무료)
4. `/billing`에서 데모 결제로 플랜/크레딧 적립

## 프로덕션 설정

### 1) Supabase

1. 프로젝트 생성 후 `supabase/schema.sql` 실행
2. Authentication → Providers에서 Email, (선택) Kakao 활성화
3. `.env.local`에 URL / anon key / service role key 입력
4. `DEMO_MODE=false`

카카오: Supabase Kakao provider에 REST API 키·리다이렉트 URL 등록  
Redirect: `https://your-domain/auth/callback`

### 2) OpenAI

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### 3) 토스페이먼츠

```
NEXT_PUBLIC_TOSS_CLIENT_KEY=...
TOSS_SECRET_KEY=...
```

테스트 키로 `/billing`에서 카드 결제 위젯 연결.

### 4) 배포 (Vercel)

환경변수 등록 후 배포. `NEXT_PUBLIC_APP_URL`을 실제 도메인으로 설정.

## MVP 범위

포함: 랜딩, 이메일/카카오 로그인, 생성, 이력, 구독(30일)·크레딧 결제, 사용량 차감  
제외: Play 앱, 스토어 자동 업로드, 팀 기능, 고도화 에디터

## 스크립트

- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드
- `npm run start` — 빌드 결과 실행
