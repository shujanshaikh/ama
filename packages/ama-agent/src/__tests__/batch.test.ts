import { describe, it, expect } from "bun:test";
import { batchTool } from "../tools/batch";
import os from "node:os";

describe("batch tool", () => {
  it("rejects recursive batch calls", async () => {
    const result = await batchTool({
      tool_calls: [{ tool: "batch", parameters: { tool_calls: [] } }],
    });
    expect(result.failed).toBe(1);
    expect(result.results[0].error).toContain("not allowed in batch");
  });

  it("rejects unknown tools", async () => {
    const result = await batchTool({
      tool_calls: [{ tool: "nonexistent", parameters: {} }],
    });
    expect(result.failed).toBe(1);
    expect(result.results[0].error).toContain("not found");
  });

  it("handles partial failure correctly", async () => {
    const result = await batchTool({
      tool_calls: [
        { tool: "readFile", parameters: { relative_file_path: "__nonexistent_file__", should_read_entire_file: true } },
        { tool: "nonexistent", parameters: {} },
      ],
    }, os.tmpdir());
    // readFile returns success: false for missing file (but doesn't throw)
    // nonexistent tool returns failure
    expect(result.totalCalls).toBe(2);
    expect(result.failed).toBeGreaterThan(0);
  });

  it("includes durationMs in results", async () => {
    const result = await batchTool({
      tool_calls: [
        { tool: "readFile", parameters: { relative_file_path: "__nonexistent__", should_read_entire_file: true } },
      ],
    }, os.tmpdir());
    expect(result.results[0].durationMs).toBeDefined();
    expect(typeof result.results[0].durationMs).toBe("number");
  });

  it("enforces max 10 tool calls", async () => {
    const calls = Array.from({ length: 12 }, (_, i) => ({
      tool: "readFile",
      parameters: { relative_file_path: `file${i}.ts`, should_read_entire_file: true },
    }));
    const result = await batchTool({ tool_calls: calls }, os.tmpdir());
    expect(result.totalCalls).toBe(12);
    // Last 2 should be discarded
    expect(result.results[10].error).toContain("Maximum of 10");
    expect(result.results[11].error).toContain("Maximum of 10");
  });
});
