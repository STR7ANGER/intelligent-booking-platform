import { recommendationInputSchema } from "@booking/contracts";
import { z } from "zod";
import type { Metrics } from "../../infra/metrics.js";
export type Candidate = {
  id: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  priceMinor?: number | undefined;
};
export type RankedCandidate = Candidate & { reason: string };
export interface RecommendationProvider {
  rank(
    candidates: Candidate[],
    preference: string,
  ): Promise<Array<{ id: string; reason: string }>>;
}
export class RecommendationService {
  constructor(
    private provider: RecommendationProvider | null,
    private metrics: Metrics,
  ) {}
  async recommend(raw: unknown) {
    const input = recommendationInputSchema.parse(raw);
    let source = "deterministic";
    let ranked: RankedCandidate[];
    try {
      if (!this.provider) throw new Error("provider unavailable");
      const response = await this.provider.rank(
        input.candidates,
        input.preference,
      );
      const byId = new Map(
        input.candidates.map((candidate) => [candidate.id, candidate]),
      );
      const unique = new Set<string>();
      ranked = response.flatMap((item) => {
        const candidate = byId.get(item.id);
        if (!candidate || unique.has(item.id)) return [];
        unique.add(item.id);
        return [
          {
            ...candidate,
            reason: z.string().trim().min(1).max(160).parse(item.reason),
          },
        ];
      });
      if (ranked.length !== input.candidates.length)
        throw new Error("incomplete ranking");
      source = "gemini";
    } catch {
      ranked = this.fallback(input.candidates, input.preference);
    }
    this.metrics.increment("recommendations_total", { source });
    return { source, candidates: ranked };
  }
  private fallback(
    candidates: Candidate[],
    preference: string,
  ): RankedCandidate[] {
    return [...candidates]
      .sort((a, b) =>
        preference === "LOWEST_PRICE"
          ? (a.priceMinor ?? Number.MAX_SAFE_INTEGER) -
              (b.priceMinor ?? Number.MAX_SAFE_INTEGER) ||
            a.startsAt.localeCompare(b.startsAt)
          : a.startsAt.localeCompare(b.startsAt),
      )
      .map((candidate) => ({
        ...candidate,
        reason:
          preference === "LOWEST_PRICE"
            ? "Lowest available price, then earliest start."
            : "Earliest available time in the requested set.",
      }));
  }
}
