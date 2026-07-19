import { createHash } from "node:crypto";
import {
  cancelBookingSchema,
  rescheduleBookingSchema,
} from "@booking/contracts";
import type { HoldStore } from "../bookings/service.js";
import { BookingError } from "../bookings/service.js";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export type ManagedBooking = {
  id: string;
  organizationId: string;
  resourceId: string;
  customerName: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  priceMinor: number;
  currency: string;
  refundMinor: number | null;
};
export interface CustomerRepository {
  search(organizationId: string): Promise<
    Array<{
      id: string;
      name: string;
      kind: string;
      location: { name: string; timeZone: string };
    }>
  >;
  find(id: string, accessTokenHash: string): Promise<ManagedBooking | null>;
  cancel(
    id: string,
    accessTokenHash: string,
    refundMinor: number,
  ): Promise<ManagedBooking | null>;
  reschedule(
    id: string,
    accessTokenHash: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<ManagedBooking | "CONFLICT" | null>;
}
export function evaluateCancellation(
  startsAt: Date,
  priceMinor: number,
  now = new Date(),
) {
  const hours = (startsAt.valueOf() - now.valueOf()) / 3_600_000;
  const refundRate = hours >= 24 ? 1 : hours >= 2 ? 0.5 : 0;
  return { refundRate, refundMinor: Math.round(priceMinor * refundRate) };
}
export class CustomerService {
  constructor(
    private repository: CustomerRepository,
    private holds: HoldStore,
  ) {}
  search(organizationId: string | undefined) {
    if (!organizationId) throw new BookingError("ORGANIZATION_REQUIRED");
    return this.repository.search(organizationId);
  }
  async get(id: string, token?: string) {
    const booking = await this.authorized(id, token);
    return booking;
  }
  async cancel(id: string, token: string | undefined, raw: unknown) {
    cancelBookingSchema.parse(raw);
    const booking = await this.authorized(id, token);
    if (booking.status !== "CONFIRMED")
      throw new BookingError("BOOKING_NOT_ACTIVE", 409);
    const policy = evaluateCancellation(booking.startsAt, booking.priceMinor);
    const updated = await this.repository.cancel(
      id,
      hash(token as string),
      policy.refundMinor,
    );
    if (!updated) throw new BookingError("BOOKING_NOT_FOUND", 404);
    return { booking: updated, policy };
  }
  async reschedule(id: string, token: string | undefined, raw: unknown) {
    const input = rescheduleBookingSchema.parse(raw);
    const booking = await this.authorized(id, token);
    if (booking.status !== "CONFIRMED")
      throw new BookingError("BOOKING_NOT_ACTIVE", 409);
    const start = new Date(input.startsAt);
    const end = new Date(input.endsAt);
    if (end <= start || start < new Date())
      throw new BookingError("INVALID_INTERVAL");
    const key = `hold:${booking.organizationId}:${booking.resourceId}:${start.toISOString()}`;
    if (!(await this.holds.owns(key, input.holdToken)))
      throw new BookingError("INVALID_HOLD", 409);
    const updated = await this.repository.reschedule(
      id,
      hash(token as string),
      start,
      end,
    );
    if (updated === "CONFLICT") throw new BookingError("SLOT_UNAVAILABLE", 409);
    if (!updated) throw new BookingError("BOOKING_NOT_FOUND", 404);
    await this.holds.release(key, input.holdToken);
    return updated;
  }
  private async authorized(id: string, token?: string) {
    if (!token || token.length < 32)
      throw new BookingError("BOOKING_ACCESS_REQUIRED", 401);
    const booking = await this.repository.find(id, hash(token));
    if (!booking) throw new BookingError("BOOKING_NOT_FOUND", 404);
    return booking;
  }
}
