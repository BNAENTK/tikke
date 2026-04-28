# Cloudflare 배포 가이드

## 구성 요소

| 항목 | 용도 |
|------|------|
| Cloudflare Pages | 랜딩 페이지 (`apps/web`) |
| Cloudflare Workers | REST API (`apps/worker`) |
| Durable Objects | WebSocket 오버레이 룸 |
| KV | 사용자 설정 동기화 |

---

## 1. Worker 배포

### 사전 준비

```bash
npm install -g wrangler
wrangler login
```

### KV 네임스페이스 생성

```bash
cd apps/worker
wrangler kv namespace create TIKKE_SETTINGS
wrangler kv namespace create TIKKE_SETTINGS --preview
```

결과로 받은 `id`와 `preview_id`를 `wrangler.toml`에 입력:

```toml
[[kv_namespaces]]
binding = "TIKKE_SETTINGS"
id = "your-kv-id-here"
preview_id = "your-preview-id-here"
```

### 환경변수 설정

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
```

개발 시 `.dev.vars` (gitignore에 포함):

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

### 배포

```bash
pnpm --filter @tikke/worker deploy
```

### API 엔드포인트

```
GET  /health                         — 헬스체크 (인증 불필요)
GET  /me                             — 내 프로필
GET  /settings                       — 설정 조회
PUT  /settings                       — 설정 업데이트 (JSON merge)
POST /overlay/rooms                  — 오버레이 룸 생성
GET  /overlay/rooms/:key             — 룸 정보 조회
GET  /overlay/rooms/:key/ws          — WebSocket 연결 (Durable Object)
POST /events/ingest                  — 이벤트 수집
```

모든 private 엔드포인트는 `Authorization: Bearer <supabase_access_token>` 필요.

---

## 2. Pages 배포 (랜딩 페이지)

```bash
cd apps/web
pnpm build          # dist/ 생성

# Cloudflare Pages에 연결 (GitHub Actions 또는 직접 업로드)
wrangler pages deploy dist --project-name tikke-web
```

빌드 설정:
- 빌드 명령어: `pnpm build`
- 출력 디렉토리: `dist`
- 루트 디렉토리: `apps/web`

SPA 라우팅 폴백은 `apps/web/public/_redirects`에 이미 설정되어 있습니다:

```
/* /index.html 200
```

---

## 3. Durable Objects (오버레이 룸)

`OverlayRoom` Durable Object은 상태 있는 WebSocket 서버로 동작합니다.

```
클라이언트 A ─┐
클라이언트 B ─┤─ OverlayRoom ─ broadcast ─ 모든 클라이언트
클라이언트 C ─┘
```

마이그레이션은 `wrangler.toml`에 자동 설정되어 있습니다:

```toml
[[migrations]]
tag = "v1"
new_classes = ["OverlayRoom"]
```

---

## 4. 개발 로컬 실행

```bash
cd apps/worker
pnpm dev    # wrangler dev → http://localhost:8787
```

```bash
cd apps/web
pnpm dev    # vite dev → http://localhost:5173
```

---

## 5. R2 (선택, 나중에)

클라우드 오버레이 에셋, 사운드 파일 동기화, 앱 업데이트 파일 배포에 사용.

```bash
wrangler r2 bucket create tikke-assets
```
