# Deployment and rollback

## Recommended topology

- Deploy `apps/web` to Vercel using the committed `vercel.json`; set `NEXT_PUBLIC_API_URL` to the public TLS API origin before building.
- Deploy `Dockerfile.api` to a container platform with TLS, health checks, autoscaling, and private access to Neon PostgreSQL and managed Redis.
- Deploy the Go availability service separately behind private service authentication when its HTTP endpoint becomes part of the public API composition.
- Run `npx prisma migrate deploy` as one release job before shifting API traffic. This project does not require MongoDB in its current architecture.

## Required secrets

Set every value documented in `.env.example`. Generate independent random values for session, admin, webhook, and operator credentials. Keep `GEMINI_API_KEY` runtime-only; deterministic recommendations remain available when it is empty. Never expose any secret with a `NEXT_PUBLIC_` prefix.

## Release gate

```sh
npm ci
npm run db:generate
npm run check
npm run build
npm run slots:test
npm run test:e2e
docker build -f Dockerfile.api -t booking-api:release .
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -f Dockerfile.web -t booking-web:release .
DATABASE_URL="$DIRECT_DATABASE_URL" npx prisma migrate deploy
```

After deployment, verify `/health`, authenticated `/internal/metrics`, customer search, a synthetic hold/booking, signed webhook replay, reconciliation, and outbox processing. Alert on error rate, latency, hold conflicts, payment signature failures, reconciliation drift, outbox delay, terminal jobs, and Gemini fallback rate.

## Backups and rollback

Enable Neon point-in-time recovery and test an isolated restore. Redis holds and cached work are disposable; payment/outbox truth is PostgreSQL. Roll back the API/web image to the previous immutable version when application health degrades. Database migrations are forward-only: use expand/migrate/contract changes and restore from a reviewed recovery point rather than improvising destructive down migrations.

This repository is release-shaped, not production-approved. Public launch still requires real provider credentials, staging load results, restore evidence, accessibility review, penetration testing, privacy/retention decisions, and operator ownership.
