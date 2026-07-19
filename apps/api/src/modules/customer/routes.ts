import { Hono } from "hono";
import { ZodError } from "zod";
import { BookingError } from "../bookings/service.js";
import type { CustomerService } from "./service.js";

const bearer = (value?: string) =>
  value?.startsWith("Bearer ") ? value.slice(7) : undefined;
export const createCustomerRoutes = (service: CustomerService) => {
  const routes = new Hono();
  routes.get("/search", async (c) =>
    respond(c, () => service.search(c.req.query("organizationId"))),
  );
  routes.get("/bookings/:id", async (c) =>
    respond(c, () =>
      service.get(c.req.param("id"), bearer(c.req.header("authorization"))),
    ),
  );
  routes.post("/bookings/:id/cancel", async (c) =>
    respond(c, () =>
      service.cancel(
        c.req.param("id"),
        bearer(c.req.header("authorization")),
        c.req.json(),
      ),
    ),
  );
  routes.post("/bookings/:id/reschedule", async (c) =>
    respond(c, () =>
      service.reschedule(
        c.req.param("id"),
        bearer(c.req.header("authorization")),
        c.req.json(),
      ),
    ),
  );
  return routes;
};
async function respond(context: any, action: () => Promise<unknown>) {
  try {
    return context.json(await action());
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
