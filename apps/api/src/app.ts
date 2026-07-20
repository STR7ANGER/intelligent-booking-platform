import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import type { Metrics } from "./infra/metrics.js";
import { createAdminRoutes } from "./modules/admin/routes.js";
import type { AdminService } from "./modules/admin/service.js";
import { createAnalyticsRoutes } from "./modules/analytics/routes.js";
import type { AnalyticsService } from "./modules/analytics/service.js";
import { createBookingRoutes } from "./modules/bookings/routes.js";
import type { BookingService } from "./modules/bookings/service.js";
import { createCommercialRoutes } from "./modules/commercial/routes.js";
import type { CommercialService } from "./modules/commercial/service.js";
import { createCustomerRoutes } from "./modules/customer/routes.js";
import type { CustomerService } from "./modules/customer/service.js";
import { createIntegrationRoutes } from "./modules/integrations/routes.js";
import type { IntegrationService } from "./modules/integrations/service.js";
import { createRecommendationRoutes } from "./modules/recommendations/routes.js";
import type { RecommendationService } from "./modules/recommendations/service.js";

export const createApp = (
  options: {
    adminService?: AdminService;
    adminKey?: string;
    bookingService?: BookingService;
    customerService?: CustomerService;
    commercialService?: CommercialService;
    integrationService?: IntegrationService;
    analyticsService?: AnalyticsService;
    recommendationService?: RecommendationService;
    metrics?: Metrics;
    operatorMetricsToken?: string;
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
  if (options.metrics && options.operatorMetricsToken)
    app.get("/internal/metrics", (context) => {
      if (
        context.req.header("authorization") !==
        `Bearer ${options.operatorMetricsToken}`
      )
        return context.json({ error: { code: "FORBIDDEN" } }, 403);
      context.header("content-type", "text/plain; version=0.0.4");
      return context.body(options.metrics?.render() ?? "");
    });
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
  if (options.integrationService && options.adminKey)
    app.route(
      "/v1/integrations",
      createIntegrationRoutes(options.integrationService, options.adminKey),
    );
  if (options.analyticsService && options.adminKey)
    app.route(
      "/v1/analytics",
      createAnalyticsRoutes(options.analyticsService, options.adminKey),
    );
  if (options.recommendationService)
    app.route(
      "/v1/recommendations",
      createRecommendationRoutes(options.recommendationService),
    );
  return app;
};
