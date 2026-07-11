# Intelligent Booking Platform — 30-Task Execution Plan

Complete tasks in order unless a dependency is explicitly removed. Each day has 10 active tasks; unfinished work rolls forward before later tasks begin. Keep at most 10 task checkboxes marked `[~]` (in progress) at once; use `[x]` only after verification.

## Day 1 — Foundation and first vertical slice (Tasks 1–10)

- [ ] 1. Design workspace, Docker, CI, domain glossary, and time-zone policy; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 2. Implement workspace, Docker, CI, domain glossary, and time-zone policy; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 3. Verify workspace, Docker, CI, domain glossary, and time-zone policy with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 4. Design organizations, locations, resources, providers, RBAC, and admin UI; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 5. Implement organizations, locations, resources, providers, RBAC, and admin UI; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 6. Verify organizations, locations, resources, providers, RBAC, and admin UI with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 7. Design recurring availability rules and Go slot-generation engine; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 8. Implement recurring availability rules and Go slot-generation engine; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 9. Verify recurring availability rules and Go slot-generation engine with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 10. Design Redis slot holds, booking transaction, idempotency, and concurrency tests; write acceptance criteria, contracts, risks, and the smallest vertical slice.

## Day 2 — Core workflows and integrations (Tasks 11–20)

- [ ] 11. Implement Redis slot holds, booking transaction, idempotency, and concurrency tests; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 12. Verify Redis slot holds, booking transaction, idempotency, and concurrency tests with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 13. Design customer search, checkout, confirmation, and booking management screens; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 14. Implement customer search, checkout, confirmation, and booking management screens; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 15. Verify customer search, checkout, confirmation, and booking management screens with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 16. Design cancellation, rescheduling, refunds, and policy evaluation; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 17. Implement cancellation, rescheduling, refunds, and policy evaluation; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 18. Verify cancellation, rescheduling, refunds, and policy evaluation with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 19. Design waitlists, memberships, packages, and dynamic-pricing rules; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 20. Implement waitlists, memberships, packages, and dynamic-pricing rules; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.

## Day 3 — Advanced behavior and production hardening (Tasks 21–30)

- [ ] 21. Verify waitlists, memberships, packages, and dynamic-pricing rules with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 22. Design payment webhooks, reconciliation, calendar sync, and reminders; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 23. Implement payment webhooks, reconciliation, calendar sync, and reminders; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 24. Verify payment webhooks, reconciliation, calendar sync, and reminders with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 25. Design Gemini slot recommendations, analytics, observability, and accessibility; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 26. Implement Gemini slot recommendations, analytics, observability, and accessibility; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 27. Verify Gemini slot recommendations, analytics, observability, and accessibility with tests, failure cases, telemetry, documentation, and a reviewable demo.
- [ ] 28. Design load/E2E tests, race-condition audit, seeded demo, and deployment docs; write acceptance criteria, contracts, risks, and the smallest vertical slice.
- [ ] 29. Implement load/E2E tests, race-condition audit, seeded demo, and deployment docs; keep frontend, API, domain logic, workers, and persistence in their declared boundaries.
- [ ] 30. Verify load/E2E tests, race-condition audit, seeded demo, and deployment docs with tests, failure cases, telemetry, documentation, and a reviewable demo.

## Task completion checklist

A task is complete only when code is formatted and typed, tests pass, migrations are reproducible, UI states are handled, authorization is enforced, logs contain no secrets, and relevant docs are updated. Track blockers beneath the task instead of silently widening scope.

