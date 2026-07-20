import { Hono } from "hono";
import { ZodError } from "zod";
import type { RecommendationService } from "./service.js";
export const createRecommendationRoutes = (service: RecommendationService) => {
  const routes = new Hono();
  routes.post("/", async (context) => {
    try {
      return context.json(await service.recommend(await context.req.json()));
    } catch (error) {
      if (error instanceof ZodError)
        return context.json({ error: { code: "INVALID_CANDIDATES" } }, 400);
      throw error;
    }
  });
  return routes;
};
