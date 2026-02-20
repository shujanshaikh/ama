import fs from "node:fs";
import { defineConfig } from "tsup";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as { version: string };

export default defineConfig([
  {
    entry: {
      cli: "./src/cli.ts",
      server: "./src/server.ts",
      "lib/daemon-entry": "./src/lib/daemon-entry.ts",
      "lib/code-server": "./src/lib/code-server.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: false,
    target: "node25",
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
    // Add shebang to make CLI executable with Node.js runtime
    banner: {
      js: "#!/usr/bin/env node",
    },
    env: {
      VERSION: process.env.VERSION ?? packageJson.version ?? "0.0.0",
    },
  }
]);
