import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

export const createApp = () => {
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
  return app;
};
