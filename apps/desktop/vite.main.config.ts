import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv(): Record<string, string> {
  try {
    const content = readFileSync(resolve(__dirname, ".env"), "utf-8");
    const vars: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) vars[match[1].trim()] = match[2].trim();
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadDotEnv();

export default defineConfig({
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
        "electron-store",
        "@workos-inc/node",
        "ws",
        "fast-glob",
        /^node:/,
      ],
    },
  },
  resolve: {
    conditions: ["node"],
  },
});
