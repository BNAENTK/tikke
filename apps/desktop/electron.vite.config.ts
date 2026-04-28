import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { loadEnv } from "vite";

const monorepoRoot = resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode ?? "development", monorepoRoot, "");

  const mainEnvDefines = {
    "process.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL ?? ""),
    "process.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ""),
    "process.env.TIKKE_OVERLAY_PORT": JSON.stringify(env.TIKKE_OVERLAY_PORT ?? "18181"),
    "process.env.TIKKE_WS_PORT": JSON.stringify(env.TIKKE_WS_PORT ?? "18182"),
  };

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      define: mainEnvDefines,
      build: {
        rollupOptions: {
          input: {
            index: resolve(__dirname, "electron/main/index.ts"),
          },
        },
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          input: {
            index: resolve(__dirname, "electron/preload/index.ts"),
          },
        },
      },
    },
    renderer: {
      plugins: [react()],
      root: ".",
      envDir: monorepoRoot,
      build: {
        rollupOptions: {
          input: {
            index: resolve(__dirname, "index.html"),
          },
        },
      },
    },
  };
});
