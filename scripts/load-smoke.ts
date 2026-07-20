const baseUrl = process.env.API_URL ?? "http://127.0.0.1:3001";
const requests = Math.max(
  10,
  Math.min(10_000, Number(process.env.LOAD_REQUESTS ?? 500)),
);
const concurrency = Math.max(
  1,
  Math.min(100, Number(process.env.LOAD_CONCURRENCY ?? 25)),
);
const durations: number[] = [];
let failures = 0;
for (let offset = 0; offset < requests; offset += concurrency) {
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, requests - offset) },
      async () => {
        const start = performance.now();
        try {
          const response = await fetch(`${baseUrl}/health`);
          if (!response.ok) failures += 1;
        } catch {
          failures += 1;
        } finally {
          durations.push(performance.now() - start);
        }
      },
    ),
  );
}
durations.sort((a, b) => a - b);
const p95 = durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] ?? 0;
console.info(
  JSON.stringify({ requests, concurrency, failures, p95Ms: Math.round(p95) }),
);
if (failures > 0 || p95 > Number(process.env.LOAD_P95_LIMIT_MS ?? 500))
  process.exitCode = 1;
