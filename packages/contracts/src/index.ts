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
