# Supabase 설정 가이드

## 1. 프로젝트 생성

1. [supabase.com](https://supabase.com)에 접속
2. **New Project** 클릭
3. 프로젝트 이름: `tikke` (자유)
4. 데이터베이스 비밀번호 설정
5. 리전: **Northeast Asia (Seoul)** 권장

## 2. 환경 변수 설정

프로젝트 생성 후 **Settings → API**에서:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

이 값을 `tikke/.env` 파일에 입력하세요.

## 3. Google OAuth 설정

### 3-1. Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. **API 및 서비스 → 사용자 인증 정보** 이동
3. **사용자 인증 정보 만들기 → OAuth 클라이언트 ID** 클릭
4. 유형: **웹 애플리케이션**
5. 이름: `Tikke`
6. 승인된 리디렉션 URI 추가:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   (`<your-project-ref>`는 Supabase URL에서 확인)
7. 클라이언트 ID와 클라이언트 보안 비밀 저장

### 3-2. Supabase Auth Google 활성화

1. Supabase Dashboard → **Authentication → Providers**
2. **Google** 클릭 → **Enable** 토글
3. Google Cloud에서 복사한 **Client ID**와 **Client Secret** 입력
4. **Save** 클릭

## 4. 리디렉션 URL 설정 (필수)

**Authentication → URL Configuration → Redirect URLs**에 아래 URL 추가:

```
http://localhost:18183/auth/callback
```

> 이 URL은 데스크탑 앱이 OAuth 콜백을 받기 위해 로컬에서 사용합니다.

**Site URL**도 확인:
```
http://localhost:3000
```
(개발 중에는 이 값이면 충분)

## 5. SQL 스키마 실행

**SQL Editor** 탭에서 아래 쿼리를 실행하세요:

```sql
-- profiles 테이블
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  plan text DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

-- user_settings 테이블
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, key)
);

-- cloud_overlay_rooms 테이블
CREATE TABLE IF NOT EXISTS public.cloud_overlay_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  room_key text UNIQUE NOT NULL,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

## 6. Row Level Security (RLS) 설정

```sql
-- RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_overlay_rooms ENABLE ROW LEVEL SECURITY;

-- profiles 정책
CREATE POLICY "users_read_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- profiles: 로그인 시 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- user_settings 정책
CREATE POLICY "users_read_own_settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_write_own_settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id);

-- cloud_overlay_rooms 정책
CREATE POLICY "users_manage_own_rooms"
  ON public.cloud_overlay_rooms FOR ALL
  USING (auth.uid() = user_id);
```

## 7. 로그인 테스트

```bash
cd "tikke"
pnpm dev
```

앱 실행 후:
1. **Google로 로그인** 버튼 클릭
2. 브라우저가 열리면 Google 계정으로 로그인
3. 성공 페이지 표시 후 앱으로 자동 복귀
4. 대시보드가 표시되면 설정 완료

## 문제 해결

| 증상 | 해결 방법 |
|------|-----------|
| 브라우저가 열리지 않음 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 확인 |
| 콜백 URL 오류 | Supabase Redirect URLs에 `http://localhost:18183/auth/callback` 추가 |
| `getProfile` null | profiles 트리거 SQL 재실행 |
| 로그인 후 다시 로그인 화면 | 세션 저장 오류 — DevTools 콘솔 확인 |
| Google 제공자 비활성화 오류 | Supabase Dashboard에서 Google Provider 활성화 확인 |
