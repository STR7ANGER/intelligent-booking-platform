import { z } from "zod";
import type { Candidate, RecommendationProvider } from "./service.js";

const outputSchema = z.object({
  ranking: z.array(z.object({ id: z.string(), reason: z.string() })),
});
export class GeminiRecommendationProvider implements RecommendationProvider {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}
  async rank(candidates: Candidate[], preference: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Rank these booking candidates for preference ${preference}. Use only supplied IDs. Candidates: ${JSON.stringify(candidates)}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                required: ["ranking"],
                properties: {
                  ranking: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      required: ["id", "reason"],
                      properties: {
                        id: { type: "STRING" },
                        reason: { type: "STRING" },
                      },
                    },
                  },
                },
              },
            },
          }),
        },
      );
      if (!response.ok) throw new Error(`Gemini ${response.status}`);
      const body = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
      return outputSchema.parse(JSON.parse(text ?? "{}")).ranking;
    } finally {
      clearTimeout(timeout);
    }
  }
}
