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
