import { defineConfig } from "vite";
import { loadEnv } from "vite";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    define: Object.fromEntries(
      Object.entries(env)
        .filter(([key]) => key.startsWith("MAIN_VITE_"))
        .map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
    ),
    build: {
      lib: {
        entry: "src/main/main.ts",
        formats: ["es"],
        fileName: () => "[name].js",
      },
      rollupOptions: {
        external: [
          "electron",
          /^node:/,
        ],
      },
    },
    resolve: {
      conditions: ["node"],
    },
  };
});
