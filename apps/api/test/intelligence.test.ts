import { describe, expect, it } from "vitest";
import { Metrics } from "../src/infra/metrics.js";
import {
  type AnalyticsRepository,
  AnalyticsService,
} from "../src/modules/analytics/service.js";
import {
  type RecommendationProvider,
  RecommendationService,
} from "../src/modules/recommendations/service.js";

class AnalyticsMemory implements AnalyticsRepository {
  value: Parameters<AnalyticsRepository["record"]>[0] | null = null;
  record(input: Parameters<AnalyticsRepository["record"]>[0]) {
    this.value = input;
    return Promise.resolve();
  }
  summary() {
    return Promise.resolve([{ event: "SEARCH_STARTED", count: 2 }]);
  }
}
const candidates = [
  {
    id: "later",
    resourceId: "resource",
    startsAt: "2030-01-03T10:00:00Z",
    endsAt: "2030-01-03T11:00:00Z",
    priceMinor: 5000,
  },
  {
    id: "earlier",
    resourceId: "resource",
    startsAt: "2030-01-02T10:00:00Z",
    endsAt: "2030-01-02T11:00:00Z",
    priceMinor: 7000,
  },
];
describe("recommendations, analytics, and metrics", () => {
  it("uses validated provider ranking", async () => {
    const provider: RecommendationProvider = {
      rank: () =>
        Promise.resolve([
          { id: "later", reason: "Lower price." },
          { id: "earlier", reason: "Earlier time." },
        ]),
    };
    const service = new RecommendationService(provider, new Metrics());
    await expect(
      service.recommend({
        organizationId: "org",
        candidates,
        preference: "BALANCED",
      }),
    ).resolves.toMatchObject({
      source: "gemini",
      candidates: [{ id: "later" }, { id: "earlier" }],
    });
  });
  it("falls back deterministically for malformed provider output", async () => {
    const provider: RecommendationProvider = {
      rank: () => Promise.resolve([{ id: "invented", reason: "No" }]),
    };
    const metrics = new Metrics();
    const result = await new RecommendationService(provider, metrics).recommend(
      { organizationId: "org", candidates, preference: "EARLIEST" },
    );
    expect(result).toMatchObject({
      source: "deterministic",
      candidates: [{ id: "earlier" }, { id: "later" }],
    });
    expect(metrics.render()).toContain('source="deterministic"');
  });
  it("hashes analytics session IDs and accepts only bounded events", async () => {
    const repository = new AnalyticsMemory();
    const service = new AnalyticsService(repository, new Metrics());
    await service.record({
      event: "SEARCH_STARTED",
      sessionId: "private-session",
      organizationId: "org",
    });
    expect(repository.value?.sessionIdHash).toHaveLength(64);
    expect(JSON.stringify(repository.value)).not.toContain("private-session");
    await expect(
      service.record({
        event: "CUSTOM_PII_EVENT",
        sessionId: "private-session",
      }),
    ).rejects.toBeDefined();
  });
});
