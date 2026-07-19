import { describe, expect, it } from "vitest";
import {
  BookingError,
  type BookingRepository,
  BookingService,
  type BookingView,
  type HoldStore,
} from "../src/modules/bookings/service.js";

class MemoryHolds implements HoldStore {
  values = new Map<string, string>();
  async acquire(key: string, token: string) {
    if (this.values.has(key)) return false;
    this.values.set(key, token);
    return true;
  }
  async owns(key: string, token: string) {
    return this.values.get(key) === token;
  }
  async release(key: string, token: string) {
    if (await this.owns(key, token)) this.values.delete(key);
  }
}
class MemoryBookings implements BookingRepository {
  slots = new Map<string, BookingView>();
  keys = new Map<string, { requestHash: string; booking: BookingView }>();
  resource(_organizationId: string, resourceId: string) {
    return Promise.resolve(
      resourceId === "resource" ? { id: resourceId, active: true } : null,
    );
  }
  replay(_organizationId: string, key: string, requestHash: string) {
    const value = this.keys.get(key);
    return Promise.resolve(
      !value
        ? null
        : value.requestHash === requestHash
          ? value.booking
          : ("IDEMPOTENCY_MISMATCH" as const),
    );
  }
  async commit(input: Parameters<BookingRepository["commit"]>[0]) {
    const previous = await this.replay(
      input.organizationId,
      input.idempotencyKeyHash,
      input.requestHash,
    );
    if (previous === "IDEMPOTENCY_MISMATCH") return previous;
    if (previous) return { booking: previous, replayed: true };
    const slot = `${input.resourceId}:${input.startsAt.toISOString()}`;
    if (this.slots.has(slot)) return "CONFLICT" as const;
    const booking = {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      resourceId: input.resourceId,
      customerName: input.customerName,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "CONFIRMED",
      createdAt: new Date(),
    };
    this.slots.set(slot, booking);
    this.keys.set(input.idempotencyKeyHash, {
      requestHash: input.requestHash,
      booking,
    });
    return { booking, replayed: false };
  }
}
const slot = {
  organizationId: "org",
  resourceId: "resource",
  startsAt: "2030-01-02T10:00:00.000Z",
  endsAt: "2030-01-02T11:00:00.000Z",
};
describe("booking concurrency", () => {
  it("allows exactly one concurrent hold", async () => {
    const service = new BookingService(new MemoryHolds(), new MemoryBookings());
    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, () => service.hold(slot)),
    );
    expect(
      attempts.filter((attempt) => attempt.status === "fulfilled"),
    ).toHaveLength(1);
  });
  it("replays a committed request after its hold is released", async () => {
    const service = new BookingService(new MemoryHolds(), new MemoryBookings());
    const hold = await service.hold(slot);
    const input = {
      ...slot,
      ...hold,
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
    };
    const first = await service.book(input, "checkout-123");
    const replay = await service.book(input, "checkout-123");
    expect(first.replayed).toBe(false);
    expect(replay).toEqual({ booking: first.booking, replayed: true });
  });
  it("rejects a forged hold without leaking it to telemetry", async () => {
    const events: Record<string, unknown>[] = [];
    const service = new BookingService(
      new MemoryHolds(),
      new MemoryBookings(),
      { record: (event) => events.push(event) },
    );
    await expect(
      service.book(
        {
          ...slot,
          holdToken: "x".repeat(32),
          customerName: "Ada Lovelace",
          customerEmail: "ada@example.com",
        },
        "checkout-123",
      ),
    ).rejects.toMatchObject({ code: "INVALID_HOLD" });
    expect(JSON.stringify(events)).not.toContain("ada@example.com");
    expect(JSON.stringify(events)).not.toContain("x".repeat(32));
  });
});
