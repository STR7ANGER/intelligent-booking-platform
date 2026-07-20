import { z } from "zod";
export const ianaTimeZoneSchema = z.string().refine((zone) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}, "Invalid IANA time zone");
export const identifierSchema = z.string().trim().min(1).max(80);
export const locationInputSchema = z.object({
  organizationId: z.string().min(1),
  name: identifierSchema,
  timeZone: ianaTimeZoneSchema,
  address: z.string().trim().max(240).optional(),
});
export const resourceInputSchema = z.object({
  organizationId: z.string().min(1),
  locationId: z.string().min(1),
  name: identifierSchema,
  kind: z.enum(["COURT", "ROOM", "DESK", "EQUIPMENT"]),
  capacity: z.number().int().min(1).max(500),
});
export const providerInputSchema = z.object({
  organizationId: z.string().min(1),
  locationId: z.string().min(1).optional(),
  displayName: identifierSchema,
  email: z.email(),
});
export const slotHoldSchema = z.object({
  organizationId: z.string().min(1),
  resourceId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
});
export const bookingInputSchema = slotHoldSchema.extend({
  holdToken: z.string().min(32).max(200),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.email(),
});
export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(240).optional(),
});
export const rescheduleBookingSchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  holdToken: z.string().min(32).max(200),
});
export const waitlistInputSchema = slotHoldSchema
  .pick({ organizationId: true, resourceId: true, startsAt: true })
  .extend({
    customerName: z.string().trim().min(2).max(100),
    customerEmail: z.email(),
  });
export const quoteInputSchema = z.object({
  organizationId: z.string().min(1),
  resourceId: z.string().min(1),
  startsAt: z.iso.datetime({ offset: true }),
  basePriceMinor: z.number().int().min(0).max(10_000_000),
  customerEmail: z.email().optional(),
});
export const membershipPlanSchema = z.object({
  organizationId: z.string().min(1),
  name: identifierSchema,
  discountBps: z.number().int().min(0).max(9000),
  monthlyPriceMinor: z.number().int().min(0),
  includedCredits: z.number().int().min(0).max(1000),
});
export const pricingRuleSchema = z.object({
  organizationId: z.string().min(1),
  resourceId: z.string().min(1).optional(),
  name: identifierSchema,
  adjustmentBps: z.number().int().min(-9000).max(20000),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  endsAt: z.iso.datetime({ offset: true }).optional(),
  priority: z.number().int().min(0).max(1000).default(100),
});
export const paymentWebhookSchema = z.object({
  eventId: z.string().min(1).max(200),
  externalPaymentId: z.string().min(1).max(200),
  bookingId: z.string().min(1),
  status: z.enum(["SUCCEEDED", "FAILED", "REFUNDED"]),
  amountMinor: z.number().int().min(0).max(10_000_000),
  currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
});
export const reconciliationSchema = z.object({
  observations: z
    .array(
      z.object({
        externalPaymentId: z.string().min(1).max(200),
        status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"]),
        amountMinor: z.number().int().min(0).max(10_000_000),
      }),
    )
    .min(1)
    .max(500),
});
export const jobCompletionSchema = z.object({
  succeeded: z.boolean(),
  errorCode: z.string().trim().min(1).max(80).optional(),
});
