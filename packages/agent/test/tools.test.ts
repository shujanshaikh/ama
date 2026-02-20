import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { editFiles } from "../src/tools/edit-file";
import { deleteFile } from "../src/tools/delete-file";
import { read_file } from "../src/tools/read-file";
import { apply_patch } from "../src/tools/stringReplace";
import { globTool } from "../src/tools/glob";
import { list } from "../src/tools/ls-dir";
import { bashTool } from "../src/tools/bash";
import { grepTool } from "../src/tools/grep";
import { batchTool } from "../src/tools/batch";

async function createTempProject(t: TestContext) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "amai-tools-test-"));
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}

// ── editFile ───────────────────────────────────────────────────────────────

test("editFile creates and updates files", async (t) => {
  const project = await createTempProject(t);

  const create = await editFiles(
    {
      target_file: "src/example.txt",
      content: "hello",
    },
    project,
  );
  assert.equal(create.success, true);
  assert.equal(create.isNewFile, true);
  assert.equal(await readFile(path.join(project, "src/example.txt"), "utf8"), "hello");

  const update = await editFiles(
    {
      target_file: "src/example.txt",
      content: "hello node",
    },
    project,
  );
  assert.equal(update.success, true);
  assert.equal(update.isNewFile, false);
  assert.equal(await readFile(path.join(project, "src/example.txt"), "utf8"), "hello node");

  const noop = await editFiles(
    {
      target_file: "src/example.txt",
      content: "hello node",
    },
    project,
  );
  assert.equal(noop.success, true);
  assert.match(noop.message ?? "", /No changes needed/i);
});

test("editFile rejects paths outside project root", async (t) => {
  const project = await createTempProject(t);
  const result = await editFiles(
    {
      target_file: "../outside.txt",
      content: "blocked",
    },
    project,
  );
  assert.equal(result.success, false);
  assert.match(String(result.error), /ACCESS_DENIED|Path validation/i);
});

test("editFile rejects missing target_file", async (t) => {
  const project = await createTempProject(t);
  const result = await editFiles(
    { target_file: "", content: "x" } as any,
    project,
  );
  assert.equal(result.success, false);
  assert.ok(result.error || result.message);
});

test("editFile creates deeply nested paths", async (t) => {
  const project = await createTempProject(t);
  const result = await editFiles(
    {
      target_file: "a/b/c/d/nested.txt",
      content: "nested content",
    },
    project,
  );
  assert.equal(result.success, true);
  assert.equal(result.isNewFile, true);
  assert.equal(
    await readFile(path.join(project, "a/b/c/d/nested.txt"), "utf8"),
    "nested content",
  );
});

test("editFile handles empty content", async (t) => {
  const project = await createTempProject(t);
  const result = await editFiles(
    { target_file: "empty.txt", content: "" },
    project,
  );
  assert.equal(result.success, true);
  assert.equal(await readFile(path.join(project, "empty.txt"), "utf8"), "");
});

// ── deleteFile ──────────────────────────────────────────────────────────────

test("deleteFile returns original content and removes the file", async (t) => {
  const project = await createTempProject(t);
  const file = path.join(project, "to-delete.txt");
  await writeFile(file, "to be removed", "utf8");

  const result = await deleteFile({ path: "to-delete.txt" }, project);
  assert.equal(result.success, true);
  assert.equal(result.content, "to be removed");
  assert.equal(existsSync(file), false);
});

test("deleteFile rejects non-existent file", async (t) => {
  const project = await createTempProject(t);
  const result = await deleteFile({ path: "nonexistent.txt" }, project);
  assert.equal(result.success, false);
  assert.match(String(result.error), /FILE_NOT_FOUND/i);
});

test("deleteFile rejects paths outside project root", async (t) => {
  const project = await createTempProject(t);
  const result = await deleteFile({ path: "../outside.txt" }, project);
  assert.equal(result.success, false);
  assert.match(String(result.error), /ACCESS_DENIED/i);
});

test("deleteFile rejects missing path parameter", async (t) => {
  const project = await createTempProject(t);
  const result = await deleteFile({ path: "" } as any, project);
  assert.equal(result.success, false);
});

// ── readFile ────────────────────────────────────────────────────────────────

test("readFile reads entire file", async (t) => {
  const project = await createTempProject(t);
  const content = "line1\nline2\nline3";
  await writeFile(path.join(project, "full.txt"), content, "utf8");

  const result = await read_file(
    { relative_file_path: "full.txt", should_read_entire_file: true },
    project,
  );
  assert.equal(result.success, true);
  const c = result.success && "content" in result ? result.content : "";
  assert.match(String(c), /1: line1/);
  assert.match(String(c), /2: line2/);
  assert.match(String(c), /3: line3/);
});

test("readFile reads line ranges", async (t) => {
  const project = await createTempProject(t);
  await writeFile(path.join(project, "range.txt"), "line1\nline2\nline3", "utf8");

  const ranged = await read_file(
    {
      relative_file_path: "range.txt",
      should_read_entire_file: false,
      start_line_one_indexed: 2,
      end_line_one_indexed: 3,
    },
    project,
  );
  assert.equal(ranged.success, true);
  const rangedContent = ranged.success && "content" in ranged ? ranged.content : "";
  assert.match(String(rangedContent), /2: line2/);
  assert.match(String(rangedContent), /3: line3/);
  assert.doesNotMatch(String(rangedContent), /1: line1/);
});

test("readFile lists directory contents", async (t) => {
  const project = await createTempProject(t);
  await mkdir(path.join(project, "nested"), { recursive: true });
  await writeFile(path.join(project, "nested", "child.txt"), "child", "utf8");

  const dir = await read_file(
    {
      relative_file_path: ".",
      should_read_entire_file: true,
    },
    project,
  );
  assert.equal(dir.success, true);
  const dirContent = dir.success && "content" in dir ? dir.content : "";
  assert.match(String(dirContent), /<type>directory<\/type>/);
  assert.match(String(dirContent), /nested\//);
});

test("readFile rejects non-existent file", async (t) => {
  const project = await createTempProject(t);
  const result = await read_file(
    { relative_file_path: "missing.txt", should_read_entire_file: true },
    project,
  );
  assert.equal(result.success, false);
  assert.match(String(result.error), /FILE_NOT_FOUND/i);
});

test("readFile rejects binary files", async (t) => {
  const project = await createTempProject(t);
  const binPath = path.join(project, "binary.zip");
  await writeFile(binPath, Buffer.from([0x50, 0x4b, 0x03, 0x04]), "binary");

  const result = await read_file(
    { relative_file_path: "binary.zip", should_read_entire_file: true },
    project,
  );
  assert.equal(result.success, false);
  assert.match(String(result.error), /BINARY_FILE/i);
});

test("readFile rejects invalid line range when using ranges", async (t) => {
  const project = await createTempProject(t);
  await writeFile(path.join(project, "small.txt"), "one line", "utf8");

  const result = await read_file(
    {
      relative_file_path: "small.txt",
      should_read_entire_file: false,
      start_line_one_indexed: 2,
      end_line_one_indexed: 3,
    },
    project,
  );
  assert.equal(result.success, false);
  assert.match(String(result.error), /INVALID_LINE_RANGE|out of range/i);
});

test("readFile rejects paths outside project root", async (t) => {
  const project = await createTempProject(t);
  const result = await read_file(
    { relative_file_path: "../outside.txt", should_read_entire_file: true },
    project,
  );
  assert.equal(result.success, false);
  assert.match(String(result.error), /ACCESS_DENIED/i);
});

// ── stringReplace ───────────────────────────────────────────────────────────

test("stringReplace updates existing content", async (t) => {
  const project = await createTempProject(t);
  const target = path.join(project, "replace.txt");
  await writeFile(target, "hello world", "utf8");

  const replaced = await apply_patch(
    {
      file_path: "replace.txt",
      old_string: "world",
      new_string: "node",
    },
    project,
  );
  assert.equal(replaced.success, true);
  assert.equal(await readFile(target, "utf8"), "hello node");
});

test("stringReplace can create files with empty old_string", async (t) => {
  const project = await createTempProject(t);
  const created = await apply_patch(
    {
      file_path: "new/file.txt",
      old_string: "",
      new_string: "created",
    },
    project,
  );
  assert.equal(created.success, true);
  assert.equal(created.isNewFile, true);
  assert.equal(await readFile(path.join(project, "new/file.txt"), "utf8"), "created");
});

test("stringReplace replaceAll replaces all occurrences", async (t) => {
  const project = await createTempProject(t);
  const target = path.join(project, "multi.txt");
  await writeFile(target, "foo foo foo", "utf8");

  const result = await apply_patch(
    {
      file_path: "multi.txt",
      old_string: "foo",
      new_string: "bar",
      replaceAll: true,
    },
    project,
  );
  assert.equal(result.success, true);
  assert.equal(await readFile(target, "utf8"), "bar bar bar");
});

test("stringReplace rejects file not found when old_string is non-empty", async (t) => {
  const project = await createTempProject(t);
  const result = await apply_patch(
    {
      file_path: "missing.txt",
      old_string: "x",
      new_string: "y",
    },
    project,
  );
  assert.equal(result.success, false);
  assert.match(String(result.error), /FILE_NOT_FOUND/i);
});

test("stringReplace rejects identical old_string and new_string", async (t) => {
  const project = await createTempProject(t);
  await writeFile(path.join(project, "same.txt"), "content", "utf8");

  const result = await apply_patch(
    {
      file_path: "same.txt",
      old_string: "content",
      new_string: "content",
    },
    project,
  );
  assert.equal(result.success, false);
  assert.match(String(result.error), /STRINGS_IDENTICAL/i);
});

test("stringReplace rejects paths outside project root", async (t) => {
  const project = await createTempProject(t);
  const result = await apply_patch(
    {
      file_path: "../outside.txt",
      old_string: "x",
      new_string: "y",
    },
    project,
  );
  assert.equal(result.success, false);
  assert.match(String(result.error), /ACCESS_DENIED/i);
});

// ── glob ───────────────────────────────────────────────────────────────────

test("glob finds files and excludes node_modules and .git", async (t) => {
  const project = await createTempProject(t);
  await mkdir(path.join(project, "src"), { recursive: true });
  await mkdir(path.join(project, "node_modules", "pkg"), { recursive: true });

  const oldFile = path.join(project, "src", "old.ts");
  const newFile = path.join(project, "src", "new.ts");
  await writeFile(oldFile, "old", "utf8");
  await writeFile(path.join(project, "node_modules", "pkg", "skip.ts"), "skip", "utf8");
  await new Promise((resolve) => setTimeout(resolve, 20));
  await writeFile(newFile, "new", "utf8");

  const result = await globTool({ pattern: "**/*.ts" }, project);
  assert.equal(result.success, true);
  const content = String(result.content);
  assert.match(content, new RegExp(newFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(content, new RegExp(oldFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(content, /node_modules/);
});

test("glob returns no files found for non-matching pattern", async (t) => {
  const project = await createTempProject(t);
  await writeFile(path.join(project, "only-txt.txt"), "x", "utf8");

  const result = await globTool({ pattern: "**/*.ts" }, project);
  assert.equal(result.success, true);
  assert.match(String(result.content), /No files found/i);
});

test("glob rejects missing pattern", async (t) => {
  const project = await createTempProject(t);
  const result = await globTool({ pattern: "" } as any, project);
  assert.equal(result.success, false);
  assert.match(String(result.error), /MISSING_PATTERN/i);
});

test("glob scopes search to path when provided", async (t) => {
  const project = await createTempProject(t);
  await mkdir(path.join(project, "src"), { recursive: true });
  await mkdir(path.join(project, "other"), { recursive: true });
  await writeFile(path.join(project, "src", "a.ts"), "a", "utf8");
  await writeFile(path.join(project, "other", "b.ts"), "b", "utf8");

  const result = await globTool({ pattern: "**/*.ts", path: "src" }, project);
  assert.equal(result.success, true);
  const content = String(result.content);
  assert.match(content, /src\/a\.ts/);
  assert.doesNotMatch(content, /other\/b\.ts/);
});

// ── listDirectory ───────────────────────────────────────────────────────────

test("listDirectory applies extension filters", async (t) => {
  const project = await createTempProject(t);
  await mkdir(path.join(project, "src"), { recursive: true });
  await writeFile(path.join(project, "src", "a.ts"), "a", "utf8");
  await writeFile(path.join(project, "src", "b.js"), "b", "utf8");

  const result = await list(
    {
      path: ".",
      recursive: true,
      maxDepth: 3,
      pattern: ".ts",
    },
    project,
  );
  assert.equal(result.success, true);
  const files = result.files ?? [];
  assert.ok(files.some((entry) => entry.path.endsWith("src/a.ts")));
  assert.ok(!files.some((entry) => entry.path.endsWith("src/b.js")));
});

test("listDirectory rejects non-existent path", async (t) => {
  const project = await createTempProject(t);
  const result = await list({ path: "nonexistent-dir" }, project);
  assert.equal(result.success, false);
  assert.match(String(result.error), /DIR_NOT_FOUND|not found/i);
});

test("listDirectory respects maxDepth", async (t) => {
  const project = await createTempProject(t);
  await mkdir(path.join(project, "a/b/c/d"), { recursive: true });
  await writeFile(path.join(project, "a/b/c/d/leaf.txt"), "leaf", "utf8");

  const shallow = await list(
    { path: ".", recursive: true, maxDepth: 1 },
    project,
  );
  assert.equal(shallow.success, true);
  const shallowPaths = (shallow.files ?? []).map((f) => f.path);
  assert.ok(shallowPaths.some((p) => p.includes("a/")));
  assert.ok(!shallowPaths.some((p) => p.includes("a/b/c/d/leaf.txt")));
});

test("listDirectory can list non-recursively", async (t) => {
  const project = await createTempProject(t);
  await mkdir(path.join(project, "subdir"), { recursive: true });
  await writeFile(path.join(project, "subdir", "nested.txt"), "nested", "utf8");

  const result = await list(
    { path: ".", recursive: false, maxDepth: 1 },
    project,
  );
  assert.equal(result.success, true);
  const files = result.files ?? [];
  assert.ok(files.some((f) => f.name === "subdir" && f.type === "directory"));
  assert.ok(!files.some((f) => f.path.includes("nested.txt")));
});

// ── bash ────────────────────────────────────────────────────────────────────

test("bash executes safe commands", async (t) => {
  const project = await createTempProject(t);
  await writeFile(path.join(project, "script.txt"), "ok", "utf8");

  const safe = await bashTool(
    {
      command: "printf hello",
      is_background: false,
      description: "Print hello",
    },
    project,
  );
  assert.equal(safe.success, true);
  assert.equal(safe.stdout, "hello");
});

test("bash blocks dangerous commands", async (t) => {
  const project = await createTempProject(t);
  const blocked = await bashTool(
    {
      command: "rm -rf /",
      is_background: false,
      description: "Dangerous deletion",
    },
    project,
  );
  assert.equal(blocked.success, false);
  assert.equal(blocked.error, "BLOCKED_COMMAND");
});

test("bash uses workdir when provided", async (t) => {
  const project = await createTempProject(t);
  await mkdir(path.join(project, "sub"), { recursive: true });
  await writeFile(path.join(project, "sub", "here.txt"), "here", "utf8");

  const result = await bashTool(
    {
      command: "cat here.txt",
      is_background: false,
      description: "Read file in subdir",
      workdir: path.join(project, "sub"),
    },
    project,
  );
  assert.equal(result.success, true);
  assert.equal(result.stdout?.trim(), "here");
});

test("bash rejects invalid timeout", async (t) => {
  const project = await createTempProject(t);
  const result = await bashTool(
    {
      command: "echo ok",
      is_background: false,
      description: "Echo",
      timeout: -1,
    },
    project,
  );
  assert.equal(result.success, false);
  assert.match(String(result.error), /INVALID_TIMEOUT/i);
});

// ── grep ───────────────────────────────────────────────────────────────────

test("grep finds matching lines (requires ripgrep)", async (t) => {
  const rg = spawnSync("rg", ["--version"], { encoding: "utf8" });
  if (rg.status !== 0) {
    t.skip("ripgrep not available");
    return;
  }

  const project = await createTempProject(t);
  await writeFile(path.join(project, "grep.txt"), "alpha\nneedle value\nomega\n", "utf8");

  const result = await grepTool(
    {
      query: "needle",
      options: { path: "." },
    },
    project,
  );

  assert.equal(result.success, true);
  assert.ok((result.matchCount ?? 0) >= 1);
  assert.match(String(result.content), /needle value/);
});

test("grep returns no matches for non-matching pattern", async (t) => {
  const rg = spawnSync("rg", ["--version"], { encoding: "utf8" });
  if (rg.status !== 0) {
    t.skip("ripgrep not available");
    return;
  }

  const project = await createTempProject(t);
  await writeFile(path.join(project, "empty.txt"), "no match here", "utf8");

  const result = await grepTool(
    { query: "xyznonexistent123", options: {} },
    project,
  );
  assert.equal(result.success, true);
  assert.equal(result.matchCount, 0);
  assert.match(String(result.message), /No matches/i);
});

test("grep rejects empty query", async (t) => {
  const project = await createTempProject(t);
  const result = await grepTool(
    { query: "", options: {} } as any,
    project,
  );
  assert.equal(result.success, false);
  assert.match(String(result.error), /MISSING_QUERY/i);
});

// ── batch ───────────────────────────────────────────────────────────────────

test("batch runs multiple tools and returns aggregate status", async (t) => {
  const project = await createTempProject(t);
  await writeFile(path.join(project, "batched.txt"), "batched-content", "utf8");

  const result = await batchTool(
    {
      tool_calls: [
        {
          tool: "readFile",
          parameters: {
            relative_file_path: "batched.txt",
            should_read_entire_file: true,
          },
        },
        {
          tool: "glob",
          parameters: {
            pattern: "**/*.txt",
          },
        },
      ],
    },
    project,
  );

  assert.equal(result.success, true);
  assert.equal(result.totalCalls, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.successful, 2);
  assert.ok(Array.isArray(result.results));
  assert.equal(result.results.length, 2);
  assert.equal(await readFile(path.join(project, "batched.txt"), "utf8"), "batched-content");
  assert.equal((await stat(path.join(project, "batched.txt"))).isFile(), true);
});

test("batch rejects unknown tool", async (t) => {
  const project = await createTempProject(t);
  const result = await batchTool(
    {
      tool_calls: [
        {
          tool: "unknownTool",
          parameters: {},
        },
      ],
    },
    project,
  );
  assert.equal(result.success, false);
  assert.equal(result.failed, 1);
  assert.ok(result.results[0].error?.includes("not found") || result.results[0].error?.includes("unknownTool"));
});

test("batch rejects nested batch calls", async (t) => {
  const project = await createTempProject(t);
  const result = await batchTool(
    {
      tool_calls: [
        {
          tool: "batch",
          parameters: {
            tool_calls: [{ tool: "readFile", parameters: {} }],
          },
        },
      ],
    },
    project,
  );
  assert.equal(result.success, false);
  assert.equal(result.failed, 1);
  assert.match(String(result.results[0].error), /not allowed in batch|disallowed/i);
});

test("batch handles mixed success and failure", async (t) => {
  const project = await createTempProject(t);
  await writeFile(path.join(project, "exists.txt"), "ok", "utf8");

  const result = await batchTool(
    {
      tool_calls: [
        {
          tool: "readFile",
          parameters: {
            relative_file_path: "exists.txt",
            should_read_entire_file: true,
          },
        },
        {
          tool: "readFile",
          parameters: {
            relative_file_path: "nonexistent.txt",
            should_read_entire_file: true,
          },
        },
      ],
    },
    project,
  );
  assert.equal(result.success, false);
  assert.equal(result.totalCalls, 2);
  assert.equal(result.successful, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.results[0].success, true);
  assert.equal(result.results[1].success, false);
});
