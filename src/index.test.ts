import request from "supertest";
import app from "./index.js";

describe("Express App", () => {
  test('GET / returns "keep a pulse"', async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("keep a pulse");
  });

  test("404 on unknown route", async () => {
    const response = await request(app).get("/unknown-route");
    expect(response.status).toBe(404);
    expect(response.text).toBe("huh");
  });
});
