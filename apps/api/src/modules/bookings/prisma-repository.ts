import { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import type { BookingRepository } from "./service.js";

const select = {
  id: true,
  organizationId: true,
  resourceId: true,
  customerName: true,
  startsAt: true,
  endsAt: true,
  status: true,
  createdAt: true,
} as const;
export class PrismaBookingRepository implements BookingRepository {
  resource(organizationId: string, resourceId: string) {
    return prisma.resource.findFirst({
      where: { id: resourceId, organizationId },
      select: { id: true, active: true },
    });
  }
  async replay(organizationId: string, keyHash: string, requestHash: string) {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { organizationId_keyHash: { organizationId, keyHash } },
    });
    if (!existing) return null;
    if (existing.requestHash !== requestHash)
      return "IDEMPOTENCY_MISMATCH" as const;
    return prisma.booking.findUnique({
      where: { id: existing.bookingId },
      select,
    });
  }
  async commit(input: Parameters<BookingRepository["commit"]>[0]) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await tx.idempotencyRecord.findUnique({
            where: {
              organizationId_keyHash: {
                organizationId: input.organizationId,
                keyHash: input.idempotencyKeyHash,
              },
            },
          });
          if (existing) {
            if (existing.requestHash !== input.requestHash)
              return "IDEMPOTENCY_MISMATCH" as const;
            const booking = await tx.booking.findUniqueOrThrow({
              where: { id: existing.bookingId },
              select,
            });
            return { booking, replayed: true };
          }
          const booking = await tx.booking.create({
            data: {
              organizationId: input.organizationId,
              resourceId: input.resourceId,
              customerName: input.customerName,
              customerEmail: input.customerEmail,
              startsAt: input.startsAt,
              endsAt: input.endsAt,
              accessTokenHash: input.accessTokenHash,
            },
            select,
          });
          await tx.idempotencyRecord.create({
            data: {
              organizationId: input.organizationId,
              keyHash: input.idempotencyKeyHash,
              requestHash: input.requestHash,
              bookingId: booking.id,
              response: booking as unknown as Prisma.InputJsonValue,
            },
          });
          return { booking, replayed: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return "CONFLICT" as const;
      throw error;
    }
  }
}
