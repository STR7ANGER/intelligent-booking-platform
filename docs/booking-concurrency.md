# Booking concurrency

Clients first acquire a five-minute Redis hold for an organization, resource, and UTC start instant. Redis `SET NX PX` makes competing hold requests atomic. Checkout requires that opaque hold token and an `Idempotency-Key` header.

The API hashes hold, access, and idempotency tokens before persistence or comparison. It checks an existing idempotency result before validating the hold so a safe retry still works after the successful request releases its hold. PostgreSQL's unique `(resourceId, startsAt)` constraint is the final double-booking guard inside a serializable transaction.

Expected failures are `SLOT_HELD`, `INVALID_HOLD`, `SLOT_UNAVAILABLE`, and `IDEMPOTENCY_MISMATCH`. Structured telemetry contains tenant identifiers and event names, never customer email or credentials.
