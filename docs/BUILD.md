# Build

## Development

```bash
pnpm dev
```

## Production build

```bash
pnpm build:desktop
```

## Windows installer

```bash
pnpm dist:win
```

Output: `apps/desktop/release/`

## Notes

- electron-builder used for packaging
- NSIS installer for Windows
- Code signing: configure in `build` section of `package.json`
- Auto-update: electron-updater (Phase 13)
