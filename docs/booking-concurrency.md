# Slot holds and booking transaction design

Task 10 freezes the next vertical-slice contract. A hold uses Redis key `hold:{organizationId}:{resourceId}:{startsAtUtc}` with `SET NX PX`, a random opaque token, and a maximum five-minute TTL. Release and renewal use Lua compare-and-delete/expire scripts so one customer cannot alter another hold.

`POST /v1/bookings` requires an idempotency key, hold token, resource, UTC interval, and customer. PostgreSQL stores the idempotency response and booking in one `SERIALIZABLE` transaction. An exclusion constraint or equivalent overlap guard is the final double-booking defense; Redis improves UX but is never the source of truth. Serialization failures retry with bounded jitter, and identical idempotency keys return the original response.

Concurrency verification will race multiple holds and booking commits for the same slot, assert exactly one winner, test expired/wrong tokens, Redis loss, request replay, tenant mismatch, and database retry exhaustion. Logs contain correlation/idempotency hashes—not raw tokens or customer data.
