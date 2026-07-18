# Foundation and time policy

The repository is a modular monolith with separately runnable Next.js web and Hono API applications, shared validation contracts, Prisma/PostgreSQL persistence, Redis coordination, and a Go availability service. Docker Compose is the local dependency contract and CI validates Node, Go, and container configuration.

All persisted instants are UTC. Each location stores a valid IANA time-zone identifier. Recurring rules use local weekday and wall-clock minutes; the availability engine resolves them for a requested local date. Nonexistent DST times are skipped, ambiguous times require an explicit offset choice, and API responses return UTC plus local display context. Browser or server defaults never decide business time.

Acceptance: a clean checkout installs, validates configuration, starts healthy PostgreSQL/Redis, builds both apps, and rejects invalid zones or weak secrets. Logs contain correlation IDs, normalized routes, duration, and status—never credentials.
