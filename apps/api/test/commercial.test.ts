import { describe, expect, it } from "vitest";
import { calculateQuote } from "../src/modules/commercial/service.js";

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
