# Customer workflows and lifecycle policy

The smallest customer slice is search → five-minute hold → checkout → confirmation. Search is tenant-scoped and only returns active resources. Confirmation reveals the random booking access token once; only its SHA-256 hash is stored. Management reads, cancellations, and reschedules require that token.

Cancellation refunds are deterministic: 100% at least 24 hours before start, 50% from 2–24 hours, and 0% under 2 hours. Cancellation is an atomic status transition. Rescheduling requires a hold for the new UTC start and relies on the booking unique constraint for the final conflict check. Current refunds are recorded as amounts; the payment integration that moves funds is intentionally Task 23.

Empty search, held slots, expired/forged tokens, duplicate checkout, inactive bookings, and reschedule conflicts return bounded states suitable for accessible inline UI messages.
