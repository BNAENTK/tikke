/**
 * pnpm 심링크를 실제 파일로 교체 — electron-builder가 심링크를 따라가지 못하는 문제 해결
 */
const fs = require("fs");
const path = require("path");

const NODE_MODULES = path.join(__dirname, "..", "node_modules");
const TARGETS = ["electron-updater", "fs-extra", "graceful-fs", "jsonfile", "universalify", "lazy-val", "builder-util-runtime"];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

for (const pkg of TARGETS) {
  const linkPath = path.join(NODE_MODULES, pkg);
  if (!fs.existsSync(linkPath)) {
    console.log(`[prepare-deps] skip (not found): ${pkg}`);
    continue;
  }
  let realPath;
  try {
    realPath = fs.realpathSync(linkPath);
  } catch {
    continue;
  }
  if (realPath === linkPath) {
    console.log(`[prepare-deps] already real: ${pkg}`);
    continue;
  }
  fs.rmSync(linkPath, { recursive: true, force: true });
  copyDir(realPath, linkPath);
  console.log(`[prepare-deps] resolved: ${pkg} <- ${realPath}`);
}
console.log("[prepare-deps] done");
