import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer"),
    },
    preserveSymlinks: false,
    dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
  },
  optimizeDeps: {
    include: [
      "shiki",
      "streamdown",
      "react-router",
      "react-router-dom",
      "@ai-sdk/react",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tooltip",
    ],
  },
  server: {
    fs: {
      allow: ["..", "../.."],
    },
  },
  build: {
    rollupOptions: {
      // Let shiki's dynamic @shikijs/langs/* imports resolve at runtime
      external: [/^@shikijs\/langs\//],
    },
  },
});
