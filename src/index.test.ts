import { describe, expect, test } from "bun:test";
import { app } from "./index";

describe("Hono Server", () => {
  test("GET / should return 'keep a pulse'", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("keep a pulse");
  });

  test("GET /unknown should return 404 with 'huh'", async () => {
    const res = await app.request("/unknown");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("huh");
  });
});
