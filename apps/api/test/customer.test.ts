import { describe, expect, it } from "vitest";
import type { HoldStore } from "../src/modules/bookings/service.js";
import {
  type CustomerRepository,
  CustomerService,
  evaluateCancellation,
  type ManagedBooking,
} from "../src/modules/customer/service.js";

const booking: ManagedBooking = {
  id: "booking",
  organizationId: "org",
  resourceId: "resource",
  customerName: "Ada",
  startsAt: new Date("2030-01-02T10:00:00Z"),
  endsAt: new Date("2030-01-02T11:00:00Z"),
  status: "CONFIRMED",
  priceMinor: 10_000,
  currency: "USD",
  refundMinor: null,
};
class Repository implements CustomerRepository {
  search() {
    return Promise.resolve([]);
  }
  find(id: string, token: string) {
    return Promise.resolve(
      id === "booking" && token.length === 64 ? booking : null,
    );
  }
  cancel(_id: string, _token: string, refundMinor: number) {
    return Promise.resolve({ ...booking, status: "CANCELLED", refundMinor });
  }
  reschedule(_id: string, _token: string, startsAt: Date, endsAt: Date) {
    return Promise.resolve({ ...booking, startsAt, endsAt });
  }
}
class Holds implements HoldStore {
  acquire() {
    return Promise.resolve(true);
  }
  owns() {
    return Promise.resolve(true);
  }
  release() {
    return Promise.resolve();
  }
}
describe("customer booking lifecycle", () => {
  it("evaluates full, partial, and zero refund windows", () => {
    const start = new Date("2030-01-03T12:00:00Z");
    expect(
      evaluateCancellation(start, 10_000, new Date("2030-01-02T11:00:00Z"))
        .refundMinor,
    ).toBe(10_000);
    expect(
      evaluateCancellation(start, 10_000, new Date("2030-01-03T06:00:00Z"))
        .refundMinor,
    ).toBe(5_000);
    expect(
      evaluateCancellation(start, 10_000, new Date("2030-01-03T11:00:00Z"))
        .refundMinor,
    ).toBe(0);
  });
  it("requires the private token", async () => {
    const service = new CustomerService(new Repository(), new Holds());
    await expect(service.get("booking")).rejects.toMatchObject({
      code: "BOOKING_ACCESS_REQUIRED",
    });
    await expect(
      service.get("booking", "secret".repeat(8)),
    ).resolves.toMatchObject({ id: "booking" });
  });
});
