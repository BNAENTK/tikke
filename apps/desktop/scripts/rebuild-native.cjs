'use strict';

const path = require('path');
const fs = require('fs');

// Resolve @electron/rebuild — supports pnpm junctions (Windows) and standard node_modules
function tryRequire(modPath) {
  try {
    return require(modPath);
  } catch {
    return null;
  }
}

async function main() {
  // Try normal resolution first (works if hoisted or in local node_modules)
  let rebuildMod = tryRequire('@electron/rebuild');

  // Fallback: resolve via pnpm virtual store junction target
  if (!rebuildMod) {
    const pnpmStore = path.resolve(__dirname, '../../../../node_modules/.pnpm');
    try {
      const entries = fs.readdirSync(pnpmStore);
      const found = entries.find((e) => e.startsWith('@electron+rebuild'));
      if (found) {
        const absPath = path.join(pnpmStore, found, 'node_modules', '@electron', 'rebuild');
        rebuildMod = tryRequire(absPath);
      }
    } catch {
      // pnpm store not found — fine
    }
  }

  if (!rebuildMod) {
    console.log('[rebuild] @electron/rebuild not found, skipping.');
    return;
  }

  const { rebuild } = rebuildMod;

  // Electron version
  const electronCandidates = [
    path.resolve(__dirname, '../node_modules/electron/package.json'),
    path.resolve(__dirname, '../../../../node_modules/electron/package.json'),
    path.resolve(__dirname, '../../../../node_modules/.pnpm/electron@30.5.1/node_modules/electron/package.json'),
  ];
  let electronVersion;
  for (const p of electronCandidates) {
    if (fs.existsSync(p)) {
      try {
        electronVersion = JSON.parse(fs.readFileSync(p, 'utf8')).version;
        break;
      } catch {
        // continue
      }
    }
  }
  if (!electronVersion) {
    console.error('[rebuild] Cannot determine Electron version. Skipping.');
    return;
  }

  console.log(`[rebuild] Rebuilding better-sqlite3 for Electron ${electronVersion}…`);
  try {
    await rebuild({
      buildPath: path.resolve(__dirname, '..'),
      electronVersion,
      onlyModules: ['better-sqlite3'],
      force: true,
    });
    console.log('[rebuild] Done.');
  } catch (err) {
    console.error('[rebuild] Failed:', err.message || err);
    process.exit(1);
  }
}

main();
