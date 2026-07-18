import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { parseEnvironment } from "./env.js";
import { PrismaAdminRepository } from "./modules/admin/prisma-repository.js";
import { AdminService } from "./modules/admin/service.js";

const environment = parseEnvironment(process.env);
const admin = new AdminService(new PrismaAdminRepository(), {
  record: (event) => console.info(JSON.stringify({ level: "info", ...event })),
});
serve({
  fetch: createApp({ adminService: admin, adminKey: environment.ADMIN_API_KEY })
    .fetch,
  port: environment.PORT,
});
console.info(
  JSON.stringify({
    level: "info",
    event: "server.started",
    port: environment.PORT,
  }),
);
