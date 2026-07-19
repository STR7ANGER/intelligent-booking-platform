import { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import type { CustomerRepository } from "./service.js";

const bookingSelect = {
  id: true,
  organizationId: true,
  resourceId: true,
  customerName: true,
  startsAt: true,
  endsAt: true,
  status: true,
  priceMinor: true,
  currency: true,
  refundMinor: true,
} as const;
export class PrismaCustomerRepository implements CustomerRepository {
  search(organizationId: string) {
    return prisma.resource.findMany({
      where: { organizationId, active: true },
      select: {
        id: true,
        name: true,
        kind: true,
        location: { select: { name: true, timeZone: true } },
      },
      orderBy: { name: "asc" },
    });
  }
  find(id: string, accessTokenHash: string) {
    return prisma.booking.findFirst({
      where: { id, accessTokenHash },
      select: bookingSelect,
    });
  }
  cancel(id: string, accessTokenHash: string, refundMinor: number) {
    return prisma.booking
      .update({
        where: { id, accessTokenHash, status: "CONFIRMED" },
        data: { status: "CANCELLED", cancelledAt: new Date(), refundMinor },
        select: bookingSelect,
      })
      .catch(() => null);
  }
  async reschedule(
    id: string,
    accessTokenHash: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    try {
      return await prisma.booking.update({
        where: { id, accessTokenHash, status: "CONFIRMED" },
        data: { startsAt, endsAt },
        select: bookingSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return "CONFLICT" as const;
      return null;
    }
  }
}
