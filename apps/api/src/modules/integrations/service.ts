import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  jobCompletionSchema,
  paymentWebhookSchema,
  reconciliationSchema,
} from "@booking/contracts";
import { BookingError } from "../bookings/service.js";

export type PaymentState = {
  externalPaymentId: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  amountMinor: number;
};
export type IntegrationJobView = {
  id: string;
  bookingId: string;
  kind: string;
  scheduledAt: Date;
  attempts: number;
};
export interface IntegrationRepository {
  processPayment(input: {
    eventId: string;
    externalPaymentId: string;
    bookingId: string;
    status: "SUCCEEDED" | "FAILED" | "REFUNDED";
    amountMinor: number;
    currency: string;
    payloadHash: string;
  }): Promise<
    | { replayed: boolean; payment: PaymentState }
    | "BOOKING_NOT_FOUND"
    | "AMOUNT_MISMATCH"
  >;
  paymentStates(externalIds: string[]): Promise<PaymentState[]>;
  claimDueJobs(now: Date, limit: number): Promise<IntegrationJobView[]>;
  completeJob(
    id: string,
    succeeded: boolean,
    errorCode?: string,
  ): Promise<void>;
}
export class IntegrationService {
  constructor(
    private repository: IntegrationRepository,
    private webhookSecret: string,
    private telemetry: { record(event: Record<string, unknown>): void } = {
      record: () => undefined,
    },
  ) {}
  verifySignature(rawBody: string, signature: string | undefined) {
    if (!signature) return false;
    const expected = createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");
    const supplied = Buffer.from(signature, "utf8");
    const target = Buffer.from(expected, "utf8");
    return (
      supplied.length === target.length && timingSafeEqual(supplied, target)
    );
  }
  async webhook(rawBody: string, signature: string | undefined) {
    if (!this.verifySignature(rawBody, signature))
      throw new BookingError("INVALID_WEBHOOK_SIGNATURE", 401);
    let raw: unknown;
    try {
      raw = JSON.parse(rawBody);
    } catch {
      throw new BookingError("INVALID_WEBHOOK_PAYLOAD");
    }
    const input = paymentWebhookSchema.parse(raw);
    const result = await this.repository.processPayment({
      ...input,
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
    });
    if (result === "BOOKING_NOT_FOUND")
      throw new BookingError("BOOKING_NOT_FOUND", 404);
    if (result === "AMOUNT_MISMATCH")
      throw new BookingError("PAYMENT_AMOUNT_MISMATCH", 409);
    this.telemetry.record({
      event: result.replayed
        ? "payment.webhook_replayed"
        : "payment.webhook_processed",
      bookingId: input.bookingId,
      paymentStatus: input.status,
    });
    return result;
  }
  async reconcile(raw: unknown) {
    const input = reconciliationSchema.parse(raw);
    const local = await this.repository.paymentStates(
      input.observations.map((item) => item.externalPaymentId),
    );
    const byId = new Map(local.map((item) => [item.externalPaymentId, item]));
    const discrepancies = input.observations.flatMap((provider) => {
      const stored = byId.get(provider.externalPaymentId);
      return !stored ||
        stored.status !== provider.status ||
        stored.amountMinor !== provider.amountMinor
        ? [
            {
              externalPaymentId: provider.externalPaymentId,
              provider,
              local: stored ?? null,
            },
          ]
        : [];
    });
    this.telemetry.record({
      event: "payment.reconciled",
      checked: input.observations.length,
      discrepancyCount: discrepancies.length,
    });
    return { checked: input.observations.length, discrepancies };
  }
  claimJobs(limit = 25) {
    return this.repository.claimDueJobs(
      new Date(),
      Math.max(1, Math.min(100, limit)),
    );
  }
  async completeJob(id: string, raw: unknown) {
    const input = jobCompletionSchema.parse(raw);
    await this.repository.completeJob(id, input.succeeded, input.errorCode);
    return { completed: true };
  }
}
