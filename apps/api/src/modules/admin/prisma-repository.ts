import { prisma } from "../../db.js";
import type { AdminRepository } from "./service.js";
export class PrismaAdminRepository implements AdminRepository {
  organization(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
  }
  async catalog(organizationId: string) {
    const organization = await this.organization(organizationId);
    if (!organization) return null;
    const [locations, resources, providers] = await Promise.all([
      prisma.location.findMany({ where: { organizationId } }),
      prisma.resource.findMany({ where: { organizationId } }),
      prisma.provider.findMany({ where: { organizationId } }),
    ]);
    return { organization, locations, resources, providers };
  }
  createLocation(input: Parameters<AdminRepository["createLocation"]>[0]) {
    return prisma.location.create({
      data: { ...input, address: input.address ?? null },
    });
  }
  async createResource(
    input: Parameters<AdminRepository["createResource"]>[0],
  ) {
    if (
      !(await prisma.location.findFirst({
        where: { id: input.locationId, organizationId: input.organizationId },
      }))
    )
      return "LOCATION_MISMATCH" as const;
    return prisma.resource.create({ data: input });
  }
  async createProvider(
    input: Parameters<AdminRepository["createProvider"]>[0],
  ) {
    if (
      input.locationId &&
      !(await prisma.location.findFirst({
        where: { id: input.locationId, organizationId: input.organizationId },
      }))
    )
      return "LOCATION_MISMATCH" as const;
    return prisma.provider.create({
      data: { ...input, locationId: input.locationId ?? null },
    });
  }
}
