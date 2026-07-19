import { serve } from "@hono/node-server";
import { createClient } from "redis";
import { createApp } from "./app.js";
import { parseEnvironment } from "./env.js";
import { PrismaAdminRepository } from "./modules/admin/prisma-repository.js";
import { AdminService } from "./modules/admin/service.js";
import { PrismaBookingRepository } from "./modules/bookings/prisma-repository.js";
import { RedisHoldStore } from "./modules/bookings/redis-holds.js";
import { BookingService } from "./modules/bookings/service.js";

const environment = parseEnvironment(process.env);
const admin = new AdminService(new PrismaAdminRepository(), {
  record: (event) => console.info(JSON.stringify({ level: "info", ...event })),
});
const redis = createClient({ url: environment.REDIS_URL });
redis.on("error", (error) =>
  console.error(
    JSON.stringify({
      level: "error",
      event: "redis.error",
      message: error.message,
    }),
  ),
);
await redis.connect();
const bookings = new BookingService(
  new RedisHoldStore(redis),
  new PrismaBookingRepository(),
  {
    record: (event) =>
      console.info(JSON.stringify({ level: "info", ...event })),
  },
);
serve({
  fetch: createApp({
    adminService: admin,
    adminKey: environment.ADMIN_API_KEY,
    bookingService: bookings,
  }).fetch,
  port: environment.PORT,
});
console.info(
  JSON.stringify({
    level: "info",
    event: "server.started",
    port: environment.PORT,
  }),
);
