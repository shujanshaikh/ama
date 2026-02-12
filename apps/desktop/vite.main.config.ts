import { defineConfig } from "vite";

export default defineConfig({
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
