# Integration operations

Payment providers send the unmodified JSON body to `POST /v1/integrations/payments/webhook` and the lowercase hex HMAC-SHA256 in `x-webhook-signature`. Store `PAYMENT_WEBHOOK_SECRET` only in the runtime secret manager. Retries with the same event ID are safe.

After a successful payment, workers authenticate with `x-admin-key`, claim due outbox jobs through `POST /v1/integrations/jobs/claim`, deliver to the configured calendar or notification adapter, then report completion. Failed jobs use exponential backoff and stop after five attempts. Logs contain booking IDs and bounded status codes, not customer content or provider credentials.

Operators submit provider observations to `POST /v1/integrations/payments/reconcile`. Discrepancies are reported for investigation; reconciliation never rewrites local money state automatically. Alert on signature failures, discrepancies, jobs delayed over five minutes, and terminal failures.
