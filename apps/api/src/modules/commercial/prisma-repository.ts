import { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import type { CommercialRepository } from "./service.js";
export class PrismaCommercialRepository implements CommercialRepository {
  async joinWaitlist(
    input: Parameters<CommercialRepository["joinWaitlist"]>[0],
  ) {
    const resource = await prisma.resource.findFirst({
      where: {
        id: input.resourceId,
        organizationId: input.organizationId,
        active: true,
      },
      select: { id: true },
    });
    if (!resource) return "RESOURCE_MISMATCH" as const;
    try {
      return await prisma.waitlistEntry.create({
        data: input,
        select: { id: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return "DUPLICATE" as const;
      throw error;
    }
  }
  async benefits(
    organizationId: string,
    resourceId: string,
    customerEmail: string | undefined,
    startsAt: Date,
  ) {
    const [membership, packageBalance, rules] = await Promise.all([
      customerEmail
        ? prisma.membership.findFirst({
            where: { organizationId, customerEmail, status: "ACTIVE" },
            select: {
              remainingCredits: true,
              plan: { select: { discountBps: true } },
            },
          })
        : null,
      customerEmail
        ? prisma.packageBalance.findFirst({
            where: {
              organizationId,
              customerEmail,
              remainingCredits: { gt: 0 },
            },
            select: { remainingCredits: true },
          })
        : null,
      prisma.pricingRule.findMany({
        where: {
          organizationId,
          active: true,
          OR: [{ resourceId }, { resourceId: null }],
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: startsAt } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: startsAt } }] },
          ],
        },
        select: { name: true, adjustmentBps: true, priority: true },
      }),
    ]);
    return {
      membershipDiscountBps: membership?.plan.discountBps ?? 0,
      packageCredits:
        (membership?.remainingCredits ?? 0) +
        (packageBalance?.remainingCredits ?? 0),
      rules,
    };
  }
  createPlan(input: Parameters<CommercialRepository["createPlan"]>[0]) {
    return prisma.membershipPlan.create({ data: input });
  }
  createRule(input: Parameters<CommercialRepository["createRule"]>[0]) {
    return prisma.pricingRule.create({ data: input });
  }
}
