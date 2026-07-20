import { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import type { IntegrationJobView, IntegrationRepository } from "./service.js";

export class PrismaIntegrationRepository implements IntegrationRepository {
  async processPayment(
    input: Parameters<IntegrationRepository["processPayment"]>[0],
  ) {
    return prisma.$transaction(
      async (tx) => {
        const previous = await tx.paymentEvent.findUnique({
          where: { providerEventId: input.eventId },
          include: { payment: true },
        });
        if (previous) return { replayed: true, payment: previous.payment };
        const booking = await tx.booking.findUnique({
          where: { id: input.bookingId },
          select: { id: true, startsAt: true, priceMinor: true },
        });
        if (!booking) return "BOOKING_NOT_FOUND" as const;
        if (booking.priceMinor > 0 && booking.priceMinor !== input.amountMinor)
          return "AMOUNT_MISMATCH" as const;
        const payment = await tx.payment.upsert({
          where: { bookingId: booking.id },
          create: {
            bookingId: booking.id,
            externalPaymentId: input.externalPaymentId,
            status: input.status,
            amountMinor: input.amountMinor,
            currency: input.currency,
          },
          update: {
            status: input.status,
            externalPaymentId: input.externalPaymentId,
          },
          select: {
            id: true,
            externalPaymentId: true,
            status: true,
            amountMinor: true,
          },
        });
        await tx.paymentEvent.create({
          data: {
            providerEventId: input.eventId,
            paymentId: payment.id,
            payloadHash: input.payloadHash,
          },
        });
        if (input.status === "SUCCEEDED") {
          const now = new Date();
          const jobs = [
            { kind: "CALENDAR_UPSERT" as const, scheduledAt: now },
            {
              kind: "REMINDER_24H" as const,
              scheduledAt: new Date(
                Math.max(
                  now.valueOf(),
                  booking.startsAt.valueOf() - 86_400_000,
                ),
              ),
            },
            {
              kind: "REMINDER_1H" as const,
              scheduledAt: new Date(
                Math.max(now.valueOf(), booking.startsAt.valueOf() - 3_600_000),
              ),
            },
          ];
          await tx.integrationJob.createMany({
            data: jobs.map((job) => ({ bookingId: booking.id, ...job })),
            skipDuplicates: true,
          });
        }
        return { replayed: false, payment };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  paymentStates(externalIds: string[]) {
    return prisma.payment.findMany({
      where: { externalPaymentId: { in: externalIds } },
      select: { externalPaymentId: true, status: true, amountMinor: true },
    });
  }
  claimDueJobs(now: Date, limit: number) {
    return prisma.$queryRaw<
      IntegrationJobView[]
    >`UPDATE "IntegrationJob" SET status = 'PROCESSING', "lockedAt" = ${now}, attempts = attempts + 1, "updatedAt" = ${now} WHERE id IN (SELECT id FROM "IntegrationJob" WHERE status = 'PENDING' AND "scheduledAt" <= ${now} ORDER BY "scheduledAt" FOR UPDATE SKIP LOCKED LIMIT ${limit}) RETURNING id, "bookingId", kind::text, "scheduledAt", attempts`;
  }
  async completeJob(id: string, succeeded: boolean, errorCode?: string) {
    const job = await prisma.integrationJob.findUnique({
      where: { id },
      select: { attempts: true },
    });
    if (!job) return;
    const exhausted = job.attempts >= 5;
    await prisma.integrationJob.update({
      where: { id },
      data: succeeded
        ? { status: "COMPLETED", lockedAt: null, lastError: null }
        : {
            status: exhausted ? "FAILED" : "PENDING",
            lockedAt: null,
            lastError: errorCode ?? "PROVIDER_ERROR",
            scheduledAt: new Date(
              Date.now() + Math.min(60, 2 ** job.attempts) * 60_000,
            ),
          },
    });
  }
}
