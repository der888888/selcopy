# Supabase SMTP — Gmail (템플릿 유지하면서 실제 발송)

Custom SMTP를 끄면 템플릿이 리셋됩니다. **끄지 말고** Gmail로 바꾸세요.

## 1. Gmail 앱 비밀번호
1. Google 계정 → 보안 → 2단계 인증 ON
2. https://myaccount.google.com/apppasswords 에서 앱 비밀번호 생성
3. 16자리 비밀번호 복사

## 2. Supabase SMTP 입력
Authentication → SMTP Settings

| 항목 | 값 |
|------|-----|
| Sender email | 네 Gmail 주소 (예: hyewon6588@gmail.com) |
| Sender name | 셀카피 |
| Host | smtp.gmail.com |
| Port | 587 |
| Username | 네 Gmail 주소 |
| Password | 앱 비밀번호 16자리 |
| Minimum interval | 60 |

저장 후 Confirm signup 템플릿 HTML이 그대로인지 확인.

## 3. URL
Authentication → URL Configuration
- Site URL: `https://selcopy.vercel.app`
- Redirect URLs에 `https://selcopy.vercel.app/auth/callback` 포함
