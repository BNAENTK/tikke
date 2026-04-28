# Build Guide

## Development

```bash
# Root (starts Electron desktop app with hot reload)
pnpm dev

# Web landing page only
pnpm dev:web

# Cloudflare Worker only
pnpm dev:worker
```

---

## App icon

The icon is generated from a Node script (no external deps required):

```bash
node apps/desktop/scripts/gen-icon.mjs
```

Output: `apps/desktop/build/icon.png` (512×512 PNG)

This is automatically generated once and committed. Regenerate only when you want to update the icon design.

---

## Production build (renderer + main)

```bash
pnpm build:desktop
# Outputs: apps/desktop/out/
```

---

## Windows installer

### Prerequisites

- Windows 10/11 (64-bit)
- pnpm installed
- Node.js 20+
- `pnpm install` already run

### Build

```bash
pnpm dist:win
```

Output: `apps/desktop/release/`

| File | Description |
|------|-------------|
| `Tikke Setup 0.1.0.exe` | NSIS installer |
| `Tikke Setup 0.1.0.exe.blockmap` | Block map for delta updates |
| `latest.yml` | Auto-update manifest |

### NSIS installer features

- User can choose installation directory
- Desktop shortcut created
- Start menu shortcut created
- Uninstaller included

---

## Auto-update

Tikke uses `electron-updater` for auto-update.

### How it works

1. On app start, `initUpdater(mainWindow)` is called.
2. User clicks **업데이트 확인** in **빌드 정보** page.
3. Updater fetches `latest.yml` from the configured update server.
4. If a newer version exists, user is prompted to download.
5. After download, user can restart + install.

### Update server

Set `publish.url` in `apps/desktop/package.json`:

```json
"publish": {
  "provider": "generic",
  "url": "https://REPLACE_WITH_UPDATE_SERVER_URL"
}
```

GitHub Releases를 사용합니다 (`https://github.com/BNAENTK/tikke`).

`GH_TOKEN` 환경변수를 설정한 뒤 빌드하면 자동으로 릴리즈에 업로드됩니다:

```bash
# PowerShell
$env:GH_TOKEN="your_github_pat"
pnpm dist:win

# bash
GH_TOKEN=your_github_pat pnpm dist:win
```

GitHub PAT는 `repo` 스코프가 필요합니다. [Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)에서 발급하세요.

---

## Code signing (Windows)

Without a code signing certificate, Windows Defender SmartScreen will warn on first run.

To sign:

1. Obtain an EV or OV code signing certificate.
2. Add to `build.win` in `package.json`:

```json
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "${env.CSC_KEY_PASSWORD}"
}
```

3. Set `CSC_KEY_PASSWORD` as an environment variable before building.

---

## Typecheck

```bash
pnpm typecheck
```

Runs `tsc --noEmit` across all workspaces.

---

## Full release checklist

- [ ] Update `version` in `apps/desktop/package.json`
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm build:desktop`
- [ ] Run `pnpm dist:win`
- [ ] Test the installer on a clean Windows machine
- [ ] Upload `latest.yml` + `.exe` + `.blockmap` to update server
- [ ] Verify auto-update from previous version
