import { prisma } from "../../db.js";
import type { AnalyticsRepository } from "./service.js";
export class PrismaAnalyticsRepository implements AnalyticsRepository {
  async record(input: Parameters<AnalyticsRepository["record"]>[0]) {
    await prisma.analyticsEvent.create({
      data: input as Parameters<typeof prisma.analyticsEvent.create>[0]["data"],
    });
  }
  async summary(organizationId: string, since: Date) {
    const groups = await prisma.analyticsEvent.groupBy({
      by: ["event"],
      where: { organizationId, occurredAt: { gte: since } },
      _count: { _all: true },
    });
    return groups.map((group) => ({
      event: group.event,
      count: group._count._all,
    }));
  }
}
