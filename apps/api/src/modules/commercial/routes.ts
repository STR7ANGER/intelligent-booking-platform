import { Hono } from "hono";
import { ZodError } from "zod";
import { BookingError } from "../bookings/service.js";
import type { CommercialService } from "./service.js";
export const createCommercialRoutes = (
  service: CommercialService,
  adminKey: string,
) => {
  const routes = new Hono();
  routes.post("/waitlist", async (c) =>
    respond(c, () => service.joinWaitlist(c.req.json()), 201),
  );
  routes.post("/quote", async (c) =>
    respond(c, () => service.quote(c.req.json())),
  );
  routes.post("/plans", async (c) =>
    c.req.header("x-admin-key") === adminKey
      ? respond(c, () => service.createPlan(c.req.json()), 201)
      : c.json({ error: { code: "FORBIDDEN" } }, 403),
  );
  routes.post("/pricing-rules", async (c) =>
    c.req.header("x-admin-key") === adminKey
      ? respond(c, () => service.createRule(c.req.json()), 201)
      : c.json({ error: { code: "FORBIDDEN" } }, 403),
  );
  return routes;
};
async function respond(
  context: any,
  action: () => Promise<unknown>,
  status = 200,
) {
  try {
    return context.json(await action(), status);
  } catch (error) {
    if (error instanceof BookingError)
      return context.json({ error: { code: error.code } }, error.status);
    if (error instanceof ZodError)
      return context.json(
        { error: { code: "INVALID_REQUEST", issues: error.issues } },
        400,
      );
    throw error;
  }
}
