import { Hono } from "hono";
import { ZodError } from "zod";
import type { AnalyticsService } from "./service.js";
export const createAnalyticsRoutes = (
  service: AnalyticsService,
  adminKey: string,
) => {
  const routes = new Hono();
  routes.post("/events", async (context) => {
    try {
      return context.json(await service.record(await context.req.json()), 202);
    } catch (error) {
      if (error instanceof ZodError)
        return context.json({ error: { code: "INVALID_EVENT" } }, 400);
      throw error;
    }
  });
  routes.get("/summary", async (context) =>
    context.req.header("x-admin-key") !== adminKey
      ? context.json({ error: { code: "FORBIDDEN" } }, 403)
      : context.json(
          await service.summary(
            context.req.query("organizationId"),
            Number(context.req.query("days") ?? 30),
          ),
        ),
  );
  return routes;
};
