import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnvironment } from "../src/env.js";
import { Metrics } from "../src/infra/metrics.js";

const env = {
  WEB_URL: "http://localhost:3000",
  API_URL: "http://localhost:3001",
  DATABASE_URL: "postgresql://user:pass@localhost/db",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "a-secure-session-secret-over-32-characters",
  ADMIN_API_KEY: "a-separate-admin-api-key-over-32-characters",
  PAYMENT_WEBHOOK_SECRET: "a-separate-webhook-secret-over-32-characters",
  OPERATOR_METRICS_TOKEN: "a-separate-operator-token-over-32-characters",
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
  it("protects operator metrics", async () => {
    const metrics = new Metrics();
    metrics.increment("test_total", { result: "ok" });
    const app = createApp({ metrics, operatorMetricsToken: "o".repeat(32) });
    expect((await app.request("/internal/metrics")).status).toBe(403);
    const response = await app.request("/internal/metrics", {
      headers: { authorization: `Bearer ${"o".repeat(32)}` },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      'booking_test_total{result="ok"} 1',
    );
  });
});
