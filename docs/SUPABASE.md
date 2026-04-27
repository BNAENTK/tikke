# Supabase

## Setup (Phase 3)

1. Create project at supabase.com
2. Enable Google OAuth provider
3. Add redirect URLs (desktop custom protocol + localhost)
4. Run SQL schema from `CLAUDE.md §8`
5. Enable RLS policies

## Environment

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## TODO

- Google OAuth flow (Phase 3)
- Session persistence (Phase 3)
- Profile loading (Phase 3)
