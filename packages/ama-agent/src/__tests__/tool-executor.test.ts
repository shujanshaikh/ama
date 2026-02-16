import { describe, it, expect } from "bun:test";
import {
  executeTool,
  parseToolCall,
  ValidationError,
  type ToolExecutorFn,
} from "../lib/tool-executor";

// ── parseToolCall validation ───────────────────────────────────────────────

describe("parseToolCall", () => {
  it("accepts a valid tool_call message", () => {
    const result = parseToolCall({
      type: "tool_call",
      id: "abc-123",
      tool: "readFile",
      args: { relative_file_path: "foo.ts" },
    });
    expect(result).not.toBeInstanceOf(ValidationError);
    if (!(result instanceof ValidationError)) {
      expect(result.tool).toBe("readFile");
    }
  });

  it("rejects messages with wrong type", () => {
    const result = parseToolCall({
      type: "rpc_call",
      id: "abc-123",
      tool: "readFile",
      args: {},
    });
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("rejects messages missing id", () => {
    const result = parseToolCall({
      type: "tool_call",
      tool: "readFile",
      args: {},
    });
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("rejects messages missing tool", () => {
    const result = parseToolCall({
      type: "tool_call",
      id: "abc-123",
      args: {},
    });
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("rejects messages missing args", () => {
    const result = parseToolCall({
      type: "tool_call",
      id: "abc-123",
      tool: "readFile",
    });
    expect(result).toBeInstanceOf(ValidationError);
  });

  it("accepts optional projectCwd", () => {
    const result = parseToolCall({
      type: "tool_call",
      id: "abc-123",
      tool: "readFile",
      args: {},
      projectCwd: "/some/path",
    });
    expect(result).not.toBeInstanceOf(ValidationError);
  });
});

// ── executeTool ────────────────────────────────────────────────────────────

describe("executeTool", () => {
  const mockExecutors: Record<string, ToolExecutorFn> = {
    echo: async (args) => ({ success: true, value: args.msg }),
    fail: async () => {
      throw new Error("deliberate failure");
    },
    slow: async () => {
      await new Promise((r) => setTimeout(r, 5_000));
      return { success: true };
    },
  };

  it("returns success for a working tool", async () => {
    const response = await executeTool("echo", { msg: "hello" }, undefined, mockExecutors);
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ success: true, value: "hello" });
    expect(response.metadata?.tool).toBe("echo");
    expect(response.metadata?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns error for unknown tool", async () => {
    const response = await executeTool("nonexistent", {}, undefined, mockExecutors);
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe("UNKNOWN_TOOL");
  });

  it("catches thrown errors", async () => {
    const response = await executeTool("fail", {}, undefined, mockExecutors);
    expect(response.success).toBe(false);
    expect(response.error?.message).toBe("deliberate failure");
  });

  it("blocks mutating tools without projectCwd", async () => {
    const mutatingExecutors: Record<string, ToolExecutorFn> = {
      editFile: async () => ({ success: true }),
    };
    const response = await executeTool("editFile", {}, undefined, mutatingExecutors);
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe("ACCESS_DENIED");
  });

  it("allows mutating tools with projectCwd", async () => {
    const mutatingExecutors: Record<string, ToolExecutorFn> = {
      editFile: async () => ({ success: true }),
    };
    const response = await executeTool("editFile", {}, "/some/path", mutatingExecutors);
    expect(response.success).toBe(true);
  });
});
