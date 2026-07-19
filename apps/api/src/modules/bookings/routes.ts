import { Hono } from "hono";
import { ZodError } from "zod";
import { BookingError, type BookingService } from "./service.js";

export const createBookingRoutes = (service: BookingService) => {
  const routes = new Hono();
  routes.post("/holds", async (context) =>
    handle(context, () => service.hold(context.req.json())),
  );
  routes.post("/", async (context) =>
    handle(context, () =>
      service.book(context.req.json(), context.req.header("idempotency-key")),
    ),
  );
  return routes;
};

async function handle(context: any, action: () => Promise<unknown>) {
  try {
    return context.json(await action(), 201);
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
