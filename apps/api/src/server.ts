import { serve } from "@hono/node-server";
import { createClient } from "redis";
import { createApp } from "./app.js";
import { parseEnvironment } from "./env.js";
import { Metrics } from "./infra/metrics.js";
import { PrismaAdminRepository } from "./modules/admin/prisma-repository.js";
import { AdminService } from "./modules/admin/service.js";
import { PrismaAnalyticsRepository } from "./modules/analytics/prisma-repository.js";
import { AnalyticsService } from "./modules/analytics/service.js";
import { PrismaBookingRepository } from "./modules/bookings/prisma-repository.js";
import { RedisHoldStore } from "./modules/bookings/redis-holds.js";
import { BookingService } from "./modules/bookings/service.js";
import { PrismaCommercialRepository } from "./modules/commercial/prisma-repository.js";
import { CommercialService } from "./modules/commercial/service.js";
import { PrismaCustomerRepository } from "./modules/customer/prisma-repository.js";
import { CustomerService } from "./modules/customer/service.js";
import { PrismaIntegrationRepository } from "./modules/integrations/prisma-repository.js";
import { IntegrationService } from "./modules/integrations/service.js";
import { GeminiRecommendationProvider } from "./modules/recommendations/gemini.js";
import { RecommendationService } from "./modules/recommendations/service.js";

const environment = parseEnvironment(process.env);
const metrics = new Metrics();
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
const holds = new RedisHoldStore(redis);
const bookings = new BookingService(holds, new PrismaBookingRepository(), {
  record: (event) => console.info(JSON.stringify({ level: "info", ...event })),
});
const customer = new CustomerService(new PrismaCustomerRepository(), holds);
const commercial = new CommercialService(new PrismaCommercialRepository(), {
  record: (event) => console.info(JSON.stringify({ level: "info", ...event })),
});
const integrations = new IntegrationService(
  new PrismaIntegrationRepository(),
  environment.PAYMENT_WEBHOOK_SECRET,
  {
    record: (event) =>
      console.info(JSON.stringify({ level: "info", ...event })),
  },
);
const analytics = new AnalyticsService(
  new PrismaAnalyticsRepository(),
  metrics,
);
const recommendationProvider = environment.GEMINI_API_KEY
  ? new GeminiRecommendationProvider(
      environment.GEMINI_API_KEY,
      environment.GEMINI_MODEL,
    )
  : null;
const recommendations = new RecommendationService(
  recommendationProvider,
  metrics,
);
serve({
  fetch: createApp({
    adminService: admin,
    adminKey: environment.ADMIN_API_KEY,
    bookingService: bookings,
    customerService: customer,
    commercialService: commercial,
    integrationService: integrations,
    analyticsService: analytics,
    recommendationService: recommendations,
    metrics,
    operatorMetricsToken: environment.OPERATOR_METRICS_TOKEN,
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
