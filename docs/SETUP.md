# Setup

## Prerequisites

- Node.js 20+
- pnpm 9+

## Install

```bash
cd tikke
pnpm install
```

## Environment

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.
```

## Dev

```bash
pnpm dev           # Desktop Electron app
pnpm dev:web       # Web (Phase 12)
pnpm dev:worker    # Worker (Phase 12)
```

## Harness

```bash
pnpm harness:chat   # Mock chat events
pnpm harness:gift   # Mock gift events
pnpm harness:stress # 1000 random events
```
