import { createHash, randomBytes } from "node:crypto";
import { bookingInputSchema, slotHoldSchema } from "@booking/contracts";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export type BookingView = {
  id: string;
  organizationId: string;
  resourceId: string;
  customerName: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  createdAt: Date;
};
export interface HoldStore {
  acquire(key: string, token: string, ttlMs: number): Promise<boolean>;
  owns(key: string, token: string): Promise<boolean>;
  release(key: string, token: string): Promise<void>;
}
export interface BookingRepository {
  resource(
    organizationId: string,
    resourceId: string,
  ): Promise<{ id: string; active: boolean } | null>;
  replay(
    organizationId: string,
    keyHash: string,
    requestHash: string,
  ): Promise<BookingView | "IDEMPOTENCY_MISMATCH" | null>;
  commit(input: {
    organizationId: string;
    resourceId: string;
    customerName: string;
    customerEmail: string;
    startsAt: Date;
    endsAt: Date;
    accessTokenHash: string;
    idempotencyKeyHash: string;
    requestHash: string;
  }): Promise<
    | { booking: BookingView; replayed: boolean }
    | "CONFLICT"
    | "IDEMPOTENCY_MISMATCH"
  >;
}
export class BookingError extends Error {
  constructor(
    readonly code: string,
    readonly status = 400,
  ) {
    super(code);
  }
}
export class BookingService {
  constructor(
    private holds: HoldStore,
    private repository: BookingRepository,
    private telemetry: { record(event: Record<string, unknown>): void } = {
      record: () => undefined,
    },
  ) {}
  async hold(raw: unknown) {
    const input = slotHoldSchema.parse(raw);
    this.validateInterval(input.startsAt, input.endsAt);
    const resource = await this.repository.resource(
      input.organizationId,
      input.resourceId,
    );
    if (!resource?.active) throw new BookingError("RESOURCE_UNAVAILABLE", 404);
    const token = randomBytes(32).toString("base64url");
    const key = this.holdKey(input);
    if (!(await this.holds.acquire(key, token, 300_000)))
      throw new BookingError("SLOT_HELD", 409);
    this.telemetry.record({
      event: "booking.hold_acquired",
      organizationId: input.organizationId,
    });
    return { holdToken: token, expiresInSeconds: 300 };
  }
  async book(raw: unknown, idempotencyKey: string | undefined) {
    if (
      !idempotencyKey ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 200
    )
      throw new BookingError("IDEMPOTENCY_KEY_REQUIRED");
    const input = bookingInputSchema.parse(raw);
    this.validateInterval(input.startsAt, input.endsAt);
    const requestHash = hash(
      JSON.stringify({ ...input, holdToken: hash(input.holdToken) }),
    );
    const idempotencyKeyHash = hash(idempotencyKey);
    const replay = await this.repository.replay(
      input.organizationId,
      idempotencyKeyHash,
      requestHash,
    );
    if (replay === "IDEMPOTENCY_MISMATCH")
      throw new BookingError("IDEMPOTENCY_MISMATCH", 409);
    if (replay) {
      this.telemetry.record({
        event: "booking.replayed",
        organizationId: input.organizationId,
      });
      return { booking: replay, replayed: true };
    }
    const key = this.holdKey(input);
    if (!(await this.holds.owns(key, input.holdToken)))
      throw new BookingError("INVALID_HOLD", 409);
    const accessToken = randomBytes(32).toString("base64url");
    const result = await this.repository.commit({
      organizationId: input.organizationId,
      resourceId: input.resourceId,
      customerName: input.customerName,
      customerEmail: input.customerEmail.toLowerCase(),
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      accessTokenHash: hash(accessToken),
      idempotencyKeyHash,
      requestHash,
    });
    if (result === "CONFLICT") throw new BookingError("SLOT_UNAVAILABLE", 409);
    if (result === "IDEMPOTENCY_MISMATCH")
      throw new BookingError("IDEMPOTENCY_MISMATCH", 409);
    await this.holds.release(key, input.holdToken);
    this.telemetry.record({
      event: result.replayed ? "booking.replayed" : "booking.confirmed",
      organizationId: input.organizationId,
    });
    return {
      booking: result.booking,
      ...(!result.replayed ? { accessToken } : {}),
      replayed: result.replayed,
    };
  }
  private holdKey(input: {
    organizationId: string;
    resourceId: string;
    startsAt: string;
  }) {
    return `hold:${input.organizationId}:${input.resourceId}:${new Date(input.startsAt).toISOString()}`;
  }
  private validateInterval(start: string, end: string) {
    const begins = new Date(start),
      finishes = new Date(end);
    if (
      !Number.isFinite(begins.valueOf()) ||
      !Number.isFinite(finishes.valueOf()) ||
      finishes <= begins ||
      finishes.valueOf() - begins.valueOf() > 12 * 60 * 60 * 1000
    )
      throw new BookingError("INVALID_INTERVAL");
    if (begins < new Date(Date.now() - 60_000))
      throw new BookingError("SLOT_IN_PAST");
  }
}
