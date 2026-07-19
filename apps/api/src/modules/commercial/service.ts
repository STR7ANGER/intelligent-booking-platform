import {
  membershipPlanSchema,
  pricingRuleSchema,
  quoteInputSchema,
  waitlistInputSchema,
} from "@booking/contracts";
import { BookingError } from "../bookings/service.js";
export interface CommercialRepository {
  joinWaitlist(input: {
    organizationId: string;
    resourceId: string;
    startsAt: Date;
    customerName: string;
    customerEmail: string;
  }): Promise<{ id: string } | "DUPLICATE" | "RESOURCE_MISMATCH">;
  benefits(
    organizationId: string,
    resourceId: string,
    customerEmail: string | undefined,
    startsAt: Date,
  ): Promise<{
    membershipDiscountBps: number;
    packageCredits: number;
    rules: Array<{ name: string; adjustmentBps: number; priority: number }>;
  }>;
  createPlan(input: {
    organizationId: string;
    name: string;
    discountBps: number;
    monthlyPriceMinor: number;
    includedCredits: number;
  }): Promise<unknown>;
  createRule(input: {
    organizationId: string;
    resourceId?: string;
    name: string;
    adjustmentBps: number;
    startsAt?: Date;
    endsAt?: Date;
    priority: number;
  }): Promise<unknown>;
}
export function calculateQuote(
  basePriceMinor: number,
  discountBps: number,
  rules: Array<{ name: string; adjustmentBps: number; priority: number }>,
) {
  const applied = [...rules].sort((a, b) => a.priority - b.priority);
  const dynamicBps = Math.max(
    -9000,
    Math.min(
      20000,
      applied.reduce((sum, rule) => sum + rule.adjustmentBps, 0),
    ),
  );
  const dynamicPrice = Math.round(
    (basePriceMinor * (10_000 + dynamicBps)) / 10_000,
  );
  const totalMinor = Math.max(
    0,
    Math.round(
      (dynamicPrice * (10_000 - Math.min(9000, discountBps))) / 10_000,
    ),
  );
  return {
    basePriceMinor,
    dynamicBps,
    membershipDiscountBps: discountBps,
    totalMinor,
    appliedRules: applied.map(({ name, adjustmentBps }) => ({
      name,
      adjustmentBps,
    })),
  };
}
export class CommercialService {
  constructor(private repository: CommercialRepository) {}
  async joinWaitlist(raw: unknown) {
    const input = waitlistInputSchema.parse(raw);
    const result = await this.repository.joinWaitlist({
      ...input,
      startsAt: new Date(input.startsAt),
      customerEmail: input.customerEmail.toLowerCase(),
    });
    if (result === "DUPLICATE")
      throw new BookingError("ALREADY_WAITLISTED", 409);
    if (result === "RESOURCE_MISMATCH")
      throw new BookingError("RESOURCE_UNAVAILABLE", 404);
    return result;
  }
  async quote(raw: unknown) {
    const input = quoteInputSchema.parse(raw);
    const benefits = await this.repository.benefits(
      input.organizationId,
      input.resourceId,
      input.customerEmail?.toLowerCase(),
      new Date(input.startsAt),
    );
    return {
      ...calculateQuote(
        input.basePriceMinor,
        benefits.membershipDiscountBps,
        benefits.rules,
      ),
      packageCreditsAvailable: benefits.packageCredits,
    };
  }
  createPlan(raw: unknown) {
    return this.repository.createPlan(membershipPlanSchema.parse(raw));
  }
  createRule(raw: unknown) {
    const input = pricingRuleSchema.parse(raw);
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt)
      throw new BookingError("INVALID_RULE_WINDOW");
    return this.repository.createRule({
      organizationId: input.organizationId,
      name: input.name,
      adjustmentBps: input.adjustmentBps,
      priority: input.priority,
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
      ...(input.startsAt ? { startsAt: new Date(input.startsAt) } : {}),
      ...(input.endsAt ? { endsAt: new Date(input.endsAt) } : {}),
    });
  }
}
