import { createHash } from "node:crypto";
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
const resource = await prisma.resource.upsert({
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
const rule = await prisma.availabilityRule.findFirst({
  where: {
    organizationId: organization.id,
    resourceId: resource.id,
    weekday: 1,
    startMinute: 540,
  },
});
if (!rule)
  await prisma.availabilityRule.create({
    data: {
      organizationId: organization.id,
      resourceId: resource.id,
      weekday: 1,
      startMinute: 540,
      endMinute: 1020,
      slotMinutes: 60,
      effectiveFrom: new Date("2026-01-01"),
    },
  });
const plan = await prisma.membershipPlan.upsert({
  where: {
    organizationId_name: { organizationId: organization.id, name: "Club Plus" },
  },
  update: { discountBps: 1000, monthlyPriceMinor: 1999, includedCredits: 2 },
  create: {
    organizationId: organization.id,
    name: "Club Plus",
    discountBps: 1000,
    monthlyPriceMinor: 1999,
    includedCredits: 2,
  },
});
await prisma.membership.upsert({
  where: {
    organizationId_customerEmail: {
      organizationId: organization.id,
      customerEmail: "demo@example.com",
    },
  },
  update: { planId: plan.id, remainingCredits: 2, status: "ACTIVE" },
  create: {
    organizationId: organization.id,
    planId: plan.id,
    customerEmail: "demo@example.com",
    remainingCredits: 2,
  },
});
const servicePackage = await prisma.servicePackage.upsert({
  where: {
    organizationId_name: {
      organizationId: organization.id,
      name: "Five Visits",
    },
  },
  update: { credits: 5, priceMinor: 4500 },
  create: {
    organizationId: organization.id,
    name: "Five Visits",
    credits: 5,
    priceMinor: 4500,
  },
});
await prisma.packageBalance.upsert({
  where: {
    packageId_customerEmail: {
      packageId: servicePackage.id,
      customerEmail: "demo@example.com",
    },
  },
  update: { remainingCredits: 5 },
  create: {
    organizationId: organization.id,
    packageId: servicePackage.id,
    customerEmail: "demo@example.com",
    remainingCredits: 5,
  },
});
const pricing = await prisma.pricingRule.findFirst({
  where: {
    organizationId: organization.id,
    resourceId: resource.id,
    name: "Evening demand",
  },
});
if (!pricing)
  await prisma.pricingRule.create({
    data: {
      organizationId: organization.id,
      resourceId: resource.id,
      name: "Evening demand",
      adjustmentBps: 1500,
      priority: 50,
    },
  });
await prisma.booking.upsert({
  where: {
    resourceId_startsAt: {
      resourceId: resource.id,
      startsAt: new Date("2030-01-07T10:00:00Z"),
    },
  },
  update: {},
  create: {
    organizationId: organization.id,
    resourceId: resource.id,
    customerName: "Demo Customer",
    customerEmail: "demo@example.com",
    accessTokenHash: createHash("sha256")
      .update("demo-access-token-not-for-production")
      .digest("hex"),
    startsAt: new Date("2030-01-07T10:00:00Z"),
    endsAt: new Date("2030-01-07T11:00:00Z"),
    priceMinor: 5000,
    currency: "USD",
  },
});
console.info(
  JSON.stringify({
    organizationId: organization.id,
    resourceId: resource.id,
    demoCustomer: "demo@example.com",
  }),
);
await prisma.$disconnect();
