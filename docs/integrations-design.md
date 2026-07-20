# Payments, calendar sync, reconciliation, and reminders

## Acceptance criteria

- A webhook is accepted only after constant-time HMAC verification over the raw request body.
- Provider event IDs are unique, so retries return the original result without duplicating money or jobs.
- A successful payment atomically records the payment and schedules calendar and reminder outbox jobs.
- Reconciliation compares bounded provider observations with local payment state and reports discrepancies without silently changing financial records.
- Workers claim due jobs with retry metadata; calendar and notification providers remain adapters outside domain logic.

## Contracts and boundaries

`IntegrationService` owns validation and orchestration. `IntegrationRepository` owns the serializable transaction and outbox. HTTP routes own raw-body/signature extraction and admin authorization. Provider delivery belongs to a worker; this slice exposes a safe claim/complete boundary rather than calling an external provider during the booking transaction.

## Risks and smallest slice

Signatures, duplicate delivery, ordering, partial provider outages, and time-zone mistakes are primary risks. The first slice supports payment success/failure/refund events, two reminder times, one calendar-upsert job, discrepancy reporting, and bounded retries. No real payment is initiated and no customer message is sent without a configured provider adapter.
