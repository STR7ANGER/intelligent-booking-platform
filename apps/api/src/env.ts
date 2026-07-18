import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  WEB_URL: z.string().url(),
  API_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  DEFAULT_TIME_ZONE: z.string().refine((zone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: zone });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA time zone"),
});
export const parseEnvironment = (input: NodeJS.ProcessEnv) =>
  schema.parse(input);
