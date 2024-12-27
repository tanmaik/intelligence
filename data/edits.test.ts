import { describe, expect, test, mock } from "bun:test";
import { main } from "./edits";

describe("Wikipedia Edit Stream", () => {
  test("should log edits for 5 seconds", async () => {
    const originalConsoleLog = console.log;
    const logs: string[] = [];

    console.log = mock((msg: string) => {
      logs.push(msg);
    });

    // Start the edit stream
    const mainPromise = main();

    // Wait for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Restore original console.log
    console.log = originalConsoleLog;

    // Check if we received any edit logs
    const editLogs = logs.filter((log) =>
      log.includes("Saved edit for article:")
    );
    expect(editLogs.length).toBeGreaterThan(0);

    // Print captured logs for verification
    console.log("Captured edit logs:", editLogs);
  });
});
