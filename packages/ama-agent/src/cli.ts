#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pc from "picocolors";
import { DEFAULT_PORT } from "./constant";

const VERSION = process.env.VERSION ?? "0.0.1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, "server.js");
spawn(process.execPath, [serverPath], {
  detached: true,
  stdio: "ignore",
}).unref();

console.log(`${pc.magenta("⚛")} ${pc.bold("Ama Agent")} ${pc.gray(VERSION)} ${pc.dim("(Ama)")}`);
console.log(`- Local:    ${pc.cyan(`http://localhost:${DEFAULT_PORT}`)}`);
