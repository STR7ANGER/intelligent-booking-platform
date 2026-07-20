# Seeded release demo

Apply migrations and run `npm run db:seed` twice. Both runs are idempotent and print the organization/resource IDs used by the UI. The seed includes an Asia/Kolkata location, court, recurring hours, active membership, prepaid package balance, demand-pricing rule, and future booking. Use only the synthetic `demo@example.com` identity.

Demo sequence:

1. Open `/book`, search with the printed organization ID, and choose Court One.
2. Enter a future time and request alternatives; note whether Gemini or deterministic ranking served the response.
3. Complete the hold/booking flow and save the one-time management token.
4. Open `/manage`, retrieve and cancel the booking, observing the refund policy.
5. Submit a signed synthetic successful-payment webhook twice and confirm one payment plus three outbox jobs.
6. Inspect tenant analytics with the admin key and metrics with the separate operator token.

Never use the committed demo access token, example secrets, or synthetic payment data outside a disposable environment.
