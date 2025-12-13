import fs from "node:fs";
import { defineConfig } from "tsup";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as { version: string };

export default defineConfig([
  {
    entry: {
      cli: "./src/cli.ts",
      server: "./src/server.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: false,
    target: "node18",
    platform: "node",
    treeshake: true,
    // Externalize Node.js built-ins and packages that use dynamic requires
    external: [
      // Node.js built-ins
      "events",
      "stream",
      "util",
      "buffer",
      "crypto",
      "http",
      "https",
      "net",
      "tls",
      "url",
      "zlib",
      // Packages that need to be external
      "ws",
    ],
    // Add shebang to make CLI executable
    banner: {
      js: "#!/usr/bin/env node",
    },
    env: {
      VERSION: process.env.VERSION ?? packageJson.version ?? "0.0.0",
    },
  }
]);
