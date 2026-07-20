# Race-condition and load audit

| Boundary | Winner guarantee | Retry behavior | Verification |
|---|---|---|---|
| Slot hold | Redis `SET NX PX` | New token after expiry | 20 simultaneous attempts yield one winner |
| Booking | PostgreSQL unique resource/start in a serializable transaction | Same hashed idempotency key replays the booking | Concurrent/unit booking suite |
| Reschedule | Existing hold plus the same database unique constraint | Conflict leaves original booking intact | Lifecycle failure tests |
| Waitlist | Unique resource/start/email | Duplicate returns `ALREADY_WAITLISTED` | Commercial service test |
| Payment event | Unique provider event ID in payment transaction | Same event returns stored payment | Signed webhook replay test |
| Integration worker | `FOR UPDATE SKIP LOCKED` atomic claim | Exponential retry, terminal after five attempts | Repository query review and worker contract test |

The opt-in load smoke sends bounded concurrent requests to `/health`, fails on any response error, and enforces a configurable p95 threshold. It is a release smoke, not capacity certification. Run sustained tests against a staging-sized database and Redis instance before setting production autoscaling limits.

```sh
API_URL=http://localhost:3001 LOAD_REQUESTS=1000 LOAD_CONCURRENCY=50 npm run test:load
```
