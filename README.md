# Tikke

TikTok LIVE 방송인을 위한 데스크탑 툴킷.

## 기능 (MVP 목표)

- Google 로그인 (Supabase Auth)
- TikTok LIVE 연결 (username 기반)
- 실시간 이벤트 수신 (채팅, 선물, 좋아요, 팔로우...)
- 선물/이벤트 사운드 재생
- TTS 읽기
- OBS 브라우저 소스 오버레이
- 로컬 SQLite 저장
- 커스텀 명령어

## 요구사항

- Node.js 20+
- pnpm 9+
- Windows 10/11

## 설치

```bash
cd tikke
pnpm install
```

## 개발 실행

```bash
pnpm dev
```

## 하네스 테스트

```bash
pnpm harness:chat
pnpm harness:gift
pnpm harness:stress
```

## 빌드

```bash
pnpm build:desktop
pnpm dist:win
```

## 문서

- [설치 가이드](docs/SETUP.md)
- [Supabase 설정](docs/SUPABASE.md)
- [Cloudflare 설정](docs/CLOUDFLARE.md)
- [빌드 가이드](docs/BUILD.md)
- [하네스 가이드](docs/HARNESS.md)
- [보안 가이드](docs/SECURITY.md)
