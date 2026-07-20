import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  type IntegrationRepository,
  IntegrationService,
  type PaymentState,
} from "../src/modules/integrations/service.js";

class IntegrationMemory implements IntegrationRepository {
  events = new Map<string, PaymentState>();
  states: PaymentState[] = [];
  completed: Array<{ id: string; succeeded: boolean }> = [];
  processPayment(
    input: Parameters<IntegrationRepository["processPayment"]>[0],
  ) {
    const previous = this.events.get(input.eventId);
    if (previous) return Promise.resolve({ replayed: true, payment: previous });
    const payment = {
      externalPaymentId: input.externalPaymentId,
      status: input.status,
      amountMinor: input.amountMinor,
    };
    this.events.set(input.eventId, payment);
    this.states = [payment];
    return Promise.resolve({ replayed: false, payment });
  }
  paymentStates() {
    return Promise.resolve(this.states);
  }
  claimDueJobs() {
    return Promise.resolve([
      {
        id: "job",
        bookingId: "booking",
        kind: "REMINDER_1H",
        scheduledAt: new Date(),
        attempts: 1,
      },
    ]);
  }
  completeJob(id: string, succeeded: boolean) {
    this.completed.push({ id, succeeded });
    return Promise.resolve();
  }
}
const secret = "webhook-secret-that-is-at-least-32-bytes";
const payload = JSON.stringify({
  eventId: "event-1",
  externalPaymentId: "pay-1",
  bookingId: "booking",
  status: "SUCCEEDED",
  amountMinor: 5000,
  currency: "usd",
});
const signature = createHmac("sha256", secret).update(payload).digest("hex");
describe("payment and integration orchestration", () => {
  it("rejects invalid signatures and safely replays provider events", async () => {
    const service = new IntegrationService(new IntegrationMemory(), secret);
    await expect(service.webhook(payload, "forged")).rejects.toMatchObject({
      code: "INVALID_WEBHOOK_SIGNATURE",
    });
    await expect(service.webhook(payload, signature)).resolves.toMatchObject({
      replayed: false,
    });
    await expect(service.webhook(payload, signature)).resolves.toMatchObject({
      replayed: true,
    });
  });
  it("reports reconciliation discrepancies without mutating local state", async () => {
    const repository = new IntegrationMemory();
    const service = new IntegrationService(repository, secret);
    await service.webhook(payload, signature);
    const result = await service.reconcile({
      observations: [
        { externalPaymentId: "pay-1", status: "REFUNDED", amountMinor: 5000 },
        { externalPaymentId: "missing", status: "SUCCEEDED", amountMinor: 100 },
      ],
    });
    expect(result).toMatchObject({ checked: 2 });
    expect(result.discrepancies).toHaveLength(2);
    expect(repository.states[0]?.status).toBe("SUCCEEDED");
  });
  it("exposes bounded worker claim and completion contracts", async () => {
    const repository = new IntegrationMemory();
    const service = new IntegrationService(repository, secret);
    await expect(service.claimJobs(999)).resolves.toHaveLength(1);
    await service.completeJob("job", {
      succeeded: false,
      errorCode: "CALENDAR_TIMEOUT",
    });
    expect(repository.completed).toEqual([{ id: "job", succeeded: false }]);
  });
});
