import { describe, expect, it } from "vitest";
import {
  type CommercialRepository,
  CommercialService,
  calculateQuote,
} from "../src/modules/commercial/service.js";

describe("commercial pricing", () => {
  it("applies rules by priority then membership discount", () => {
    expect(
      calculateQuote(10_000, 1000, [
        { name: "Peak", adjustmentBps: 2000, priority: 20 },
        { name: "Early", adjustmentBps: -500, priority: 10 },
      ]),
    ).toEqual({
      basePriceMinor: 10_000,
      dynamicBps: 1500,
      membershipDiscountBps: 1000,
      totalMinor: 10_350,
      appliedRules: [
        { name: "Early", adjustmentBps: -500 },
        { name: "Peak", adjustmentBps: 2000 },
      ],
    });
  });
  it("caps extreme discounts and surcharges", () => {
    expect(
      calculateQuote(10_000, 20_000, [
        { name: "Promo", adjustmentBps: -20_000, priority: 1 },
      ]).totalMinor,
    ).toBe(100);
    expect(
      calculateQuote(10_000, 0, [
        { name: "Demand", adjustmentBps: 50_000, priority: 1 },
      ]).totalMinor,
    ).toBe(30_000);
  });
});

class CommercialMemory implements CommercialRepository {
  waitlisted = false;
  joinWaitlist() {
    if (this.waitlisted) return Promise.resolve("DUPLICATE" as const);
    this.waitlisted = true;
    return Promise.resolve({ id: "waitlist-1" });
  }
  benefits() {
    return Promise.resolve({
      membershipDiscountBps: 1000,
      packageCredits: 3,
      rules: [{ name: "Peak", adjustmentBps: 1000, priority: 1 }],
    });
  }
  createPlan(input: unknown) {
    return Promise.resolve(input);
  }
  createRule(input: unknown) {
    return Promise.resolve(input);
  }
}

describe("commercial workflows", () => {
  it("deduplicates waitlist entries and excludes customer data from telemetry", async () => {
    const events: Record<string, unknown>[] = [];
    const service = new CommercialService(new CommercialMemory(), {
      record: (event) => events.push(event),
    });
    const input = {
      organizationId: "org",
      resourceId: "resource",
      startsAt: "2030-01-02T10:00:00Z",
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
    };
    await expect(service.joinWaitlist(input)).resolves.toEqual({
      id: "waitlist-1",
    });
    await expect(service.joinWaitlist(input)).rejects.toMatchObject({
      code: "ALREADY_WAITLISTED",
    });
    expect(JSON.stringify(events)).not.toContain("ada@example.com");
  });
  it("reports benefits without consuming package credits", async () => {
    const service = new CommercialService(new CommercialMemory());
    await expect(
      service.quote({
        organizationId: "org",
        resourceId: "resource",
        startsAt: "2030-01-02T10:00:00Z",
        basePriceMinor: 10_000,
        customerEmail: "ada@example.com",
      }),
    ).resolves.toMatchObject({ totalMinor: 9900, packageCreditsAvailable: 3 });
  });
});
