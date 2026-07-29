# Supabase 인증 메일 템플릿 적용 (무료)

코드로는 호스팅 Supabase 메일을 자동 교체할 수 없습니다.
**대시보드에 HTML을 붙여넣으면** 무료로 바로 적용됩니다.

## 적용 방법

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. 왼쪽 **Authentication** → **Email Templates**
3. **Confirm signup** 선택
4. Subject를 아래로 교체:

```
[셀카피] 이메일 인증을 완료해 주세요
```

5. Body에 `supabase/templates/confirmation.html` **전체 내용** 붙여넣기 → Save
6. (선택) **Reset password**도 같은 방식으로
   - Subject: `[셀카피] 비밀번호 재설정`
   - Body: `supabase/templates/recovery.html`

## 참고

- `{{ .ConfirmationURL }}` 변수를 지우면 인증 링크가 깨집니다.
- 기본 발신자는 여전히 `Supabase Auth` / `noreply@mail.app.supabase.io` 입니다.
  발신 이름·도메인을 바꾸려면 나중에 무료 SMTP(예: Resend 무료 티어)를 연결하면 됩니다.
- Site URL이 `https://selcopy.vercel.app`인지 Authentication → URL Configuration에서 확인하세요.
