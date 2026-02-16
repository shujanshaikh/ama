import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  validatePath,
  isPathWithinProject,
  requireProjectCwd,
} from "../lib/sandbox";

const TEST_DIR = path.join(os.tmpdir(), "ama-sandbox-test-" + Date.now());
const PROJECT_DIR = path.join(TEST_DIR, "project");
const OUTSIDE_DIR = path.join(TEST_DIR, "outside");

beforeAll(() => {
  mkdirSync(path.join(PROJECT_DIR, "src"), { recursive: true });
  mkdirSync(OUTSIDE_DIR, { recursive: true });
  writeFileSync(path.join(PROJECT_DIR, "src/index.ts"), "// ok");
  writeFileSync(path.join(OUTSIDE_DIR, "secret.txt"), "secret");
  // Symlink escape: project/link -> ../outside
  symlinkSync(OUTSIDE_DIR, path.join(PROJECT_DIR, "link"));
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

// ── isPathWithinProject ────────────────────────────────────────────────────

describe("isPathWithinProject", () => {
  it("allows paths inside the project", () => {
    expect(isPathWithinProject("src/index.ts", PROJECT_DIR)).toBe(true);
  });

  it("allows the project root itself", () => {
    expect(isPathWithinProject(".", PROJECT_DIR)).toBe(true);
  });

  it("rejects ../  traversal", () => {
    expect(isPathWithinProject("../outside/secret.txt", PROJECT_DIR)).toBe(false);
  });

  it("rejects absolute paths outside the project", () => {
    expect(isPathWithinProject("/etc/passwd", PROJECT_DIR)).toBe(false);
  });

  it("rejects symlink escapes", () => {
    expect(isPathWithinProject("link/secret.txt", PROJECT_DIR)).toBe(false);
  });

  it("rejects deeply nested traversal", () => {
    expect(isPathWithinProject("src/../../outside/secret.txt", PROJECT_DIR)).toBe(false);
  });
});

// ── validatePath ───────────────────────────────────────────────────────────

describe("validatePath", () => {
  it("returns valid for paths inside project", () => {
    const result = validatePath("src/index.ts", PROJECT_DIR);
    expect(result.valid).toBe(true);
    expect(result.resolvedPath).toBeDefined();
  });

  it("returns invalid for paths outside project", () => {
    const result = validatePath("../outside/secret.txt", PROJECT_DIR);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("ACCESS_DENIED");
  });

  it("returns invalid when projectCwd is empty", () => {
    const result = validatePath("foo.txt", "");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("ACCESS_DENIED");
  });
});

// ── requireProjectCwd ──────────────────────────────────────────────────────

describe("requireProjectCwd", () => {
  it("blocks mutating tools without projectCwd", () => {
    const result = requireProjectCwd("editFile", undefined);
    expect(result.allowed).toBe(false);
  });

  it("blocks deleteFile without projectCwd", () => {
    const result = requireProjectCwd("deleteFile", undefined);
    expect(result.allowed).toBe(false);
  });

  it("allows read-only tools without projectCwd", () => {
    const result = requireProjectCwd("readFile", undefined);
    expect(result.allowed).toBe(true);
  });

  it("allows mutating tools when projectCwd is provided", () => {
    const result = requireProjectCwd("editFile", "/some/path");
    expect(result.allowed).toBe(true);
  });
});
