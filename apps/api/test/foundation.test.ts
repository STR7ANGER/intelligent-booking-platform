import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/env.js";

const env = {
  WEB_URL: "http://localhost:3000",
  API_URL: "http://localhost:3001",
  DATABASE_URL: "postgresql://user:pass@localhost/db",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "a-secure-session-secret-over-32-characters",
  ADMIN_API_KEY: "a-separate-admin-api-key-over-32-characters",
  PAYMENT_WEBHOOK_SECRET: "a-separate-webhook-secret-over-32-characters",
  DEFAULT_TIME_ZONE: "Asia/Kolkata",
};
describe("foundation", () => {
  it("validates IANA zones and secrets", () => {
    expect(parseEnvironment(env)).toMatchObject({
      DEFAULT_TIME_ZONE: "Asia/Kolkata",
    });
    expect(() =>
      parseEnvironment({ ...env, DEFAULT_TIME_ZONE: "GMT+5:30" }),
    ).toThrow();
    expect(() =>
      parseEnvironment({ ...env, SESSION_SECRET: "short" }),
    ).toThrow();
  });
  it("returns bounded health metadata", async () => {
    const response = await createApp().request("/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "booking-api",
      timePolicy: "UTC_INSTANT_IANA_ZONE",
    });
  });
});
