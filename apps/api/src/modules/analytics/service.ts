import { createHash } from "node:crypto";
import { analyticsEventSchema } from "@booking/contracts";
import type { Metrics } from "../../infra/metrics.js";
export interface AnalyticsRepository {
  record(input: {
    event: string;
    sessionIdHash: string;
    organizationId?: string;
    resourceId?: string;
  }): Promise<void>;
  summary(
    organizationId: string,
    since: Date,
  ): Promise<Array<{ event: string; count: number }>>;
}
export class AnalyticsService {
  constructor(
    private repository: AnalyticsRepository,
    private metrics: Metrics,
  ) {}
  async record(raw: unknown) {
    const input = analyticsEventSchema.parse(raw);
    await this.repository.record({
      event: input.event,
      sessionIdHash: createHash("sha256").update(input.sessionId).digest("hex"),
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
    });
    this.metrics.increment("analytics_events_total", {
      event: input.event.toLowerCase(),
    });
    return { accepted: true };
  }
  summary(organizationId: string | undefined, days = 30) {
    if (!organizationId) throw new Error("ORGANIZATION_REQUIRED");
    const boundedDays = Math.max(1, Math.min(90, days));
    return this.repository.summary(
      organizationId,
      new Date(Date.now() - boundedDays * 86_400_000),
    );
  }
}
