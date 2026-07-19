import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { createAdminRoutes } from "./modules/admin/routes.js";
import type { AdminService } from "./modules/admin/service.js";
import { createBookingRoutes } from "./modules/bookings/routes.js";
import type { BookingService } from "./modules/bookings/service.js";
import { createCommercialRoutes } from "./modules/commercial/routes.js";
import type { CommercialService } from "./modules/commercial/service.js";
import { createCustomerRoutes } from "./modules/customer/routes.js";
import type { CustomerService } from "./modules/customer/service.js";

export const createApp = (
  options: {
    adminService?: AdminService;
    adminKey?: string;
    bookingService?: BookingService;
    customerService?: CustomerService;
    commercialService?: CommercialService;
  } = {},
) => {
  const app = new Hono();
  app.use("*", requestId());
  app.use(
    "*",
    cors({
      origin: process.env.WEB_URL ?? "http://localhost:3000",
      credentials: true,
    }),
  );
  app.use("*", async (context, next) => {
    const start = performance.now();
    await next();
    console.info(
      JSON.stringify({
        level: "info",
        event: "http.completed",
        requestId: context.get("requestId"),
        method: context.req.method,
        route: context.req.path.startsWith("/v1/") ? "/v1/*" : context.req.path,
        status: context.res.status,
        durationMs: Math.round(performance.now() - start),
      }),
    );
  });
  app.get("/health", (context) =>
    context.json({
      status: "ok",
      service: "booking-api",
      timePolicy: "UTC_INSTANT_IANA_ZONE",
    }),
  );
  if (options.adminService && options.adminKey)
    app.route(
      "/v1/admin",
      createAdminRoutes(options.adminService, options.adminKey),
    );
  if (options.bookingService)
    app.route("/v1/bookings", createBookingRoutes(options.bookingService));
  if (options.customerService)
    app.route("/v1/customer", createCustomerRoutes(options.customerService));
  if (options.commercialService && options.adminKey)
    app.route(
      "/v1/commercial",
      createCommercialRoutes(options.commercialService, options.adminKey),
    );
  return app;
};
