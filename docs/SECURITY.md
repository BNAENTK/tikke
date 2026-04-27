# Security

## Electron

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- `webSecurity: true`
- All Node APIs accessed via preload `contextBridge` only

## IPC

- All IPC payloads validated before processing
- `isValidEvent()` checks type and required fields
- Window control handlers use `BrowserWindow.fromWebContents(e.sender)`

## Secrets

- Never commit `.env`
- Use `.env.example` as template
- Supabase anon key is public-safe; service role key must never reach renderer

## Overlays

- All user-generated content must be HTML-escaped before injection
- Never execute arbitrary strings from chat as commands
- Shell execution from chat is prohibited

## Chat commands

- Command list is local allowlist only
- No shell execution
- Webhook calls must validate URL scheme (https only)
