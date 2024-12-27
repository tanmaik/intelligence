import { describe, expect, test, mock } from "bun:test";
import { main } from "./edits";

describe("Wikipedia Edit Stream", () => {
  test("should log edits for 5 seconds", async () => {
    const originalConsoleLog = console.log;
    const logs: string[] = [];

    console.log = mock((msg: string) => {
      logs.push(msg);
    });

    await main(5000);
    console.log = originalConsoleLog;

    const editLogs = logs.filter((log) => log.includes("edit:"));

    expect(editLogs.length).toBeGreaterThan(0);
  }, 10000);
});
