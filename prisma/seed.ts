import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const organization = await prisma.organization.upsert({
  where: { slug: "demo" },
  update: {},
  create: { slug: "demo", name: "Slotwise Demo" },
});
const location = await prisma.location.upsert({
  where: {
    organizationId_name: {
      organizationId: organization.id,
      name: "Indiranagar Arena",
    },
  },
  update: {},
  create: {
    organizationId: organization.id,
    name: "Indiranagar Arena",
    timeZone: "Asia/Kolkata",
    address: "Bengaluru",
  },
});
await prisma.resource.upsert({
  where: { locationId_name: { locationId: location.id, name: "Court One" } },
  update: {},
  create: {
    organizationId: organization.id,
    locationId: location.id,
    name: "Court One",
    kind: "COURT",
    capacity: 4,
  },
});
await prisma.$disconnect();
