import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { AdminError, type AdminService } from "./service.js";

const valid = (value: string | undefined, key: string) => {
  if (!value) return false;
  const a = Buffer.from(value),
    b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
};
export const createAdminRoutes = (service: AdminService, key: string) => {
  const app = new Hono();
  app.use("*", async (c, next) => {
    if (!valid(c.req.header("x-admin-key"), key))
      return c.json({ error: { code: "FORBIDDEN" } }, 403);
    await next();
  });
  app.onError((error, c) => {
    if (error instanceof AdminError)
      return c.json({ error: { code: error.code } }, error.status as 400);
    if (error instanceof z.ZodError)
      return c.json({ error: { code: "VALIDATION_ERROR" } }, 400);
    throw error;
  });
  app.get("/catalog/:organizationId", async (c) =>
    c.json(await service.catalog(c.req.param("organizationId"))),
  );
  app.post("/locations", async (c) =>
    c.json(await service.createLocation(await c.req.json()), 201),
  );
  app.post("/resources", async (c) =>
    c.json(await service.createResource(await c.req.json()), 201),
  );
  app.post("/providers", async (c) =>
    c.json(await service.createProvider(await c.req.json()), 201),
  );
  return app;
};
