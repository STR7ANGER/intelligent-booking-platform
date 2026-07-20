import { Hono } from "hono";
import { ZodError } from "zod";
import { BookingError } from "../bookings/service.js";
import type { IntegrationService } from "./service.js";

export const createIntegrationRoutes = (
  service: IntegrationService,
  adminKey: string,
) => {
  const routes = new Hono();
  routes.post("/payments/webhook", async (context) =>
    respond(context, () =>
      context.req
        .text()
        .then((body) =>
          service.webhook(body, context.req.header("x-webhook-signature")),
        ),
    ),
  );
  routes.post("/payments/reconcile", async (context) =>
    admin(context, adminKey, () => service.reconcile(context.req.json())),
  );
  routes.post("/jobs/claim", async (context) =>
    admin(context, adminKey, () =>
      service.claimJobs(Number(context.req.query("limit") ?? 25)),
    ),
  );
  routes.post("/jobs/:id/complete", async (context) =>
    admin(context, adminKey, () =>
      service.completeJob(context.req.param("id"), context.req.json()),
    ),
  );
  return routes;
};
async function admin(
  context: any,
  key: string,
  action: () => Promise<unknown>,
) {
  if (context.req.header("x-admin-key") !== key)
    return context.json({ error: { code: "FORBIDDEN" } }, 403);
  return respond(context, action);
}
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
