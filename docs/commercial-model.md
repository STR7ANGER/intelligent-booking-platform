# Waitlists, benefits, packages, and pricing

Waitlists are tenant/resource scoped and deduplicate the same email and UTC start. Promotion is deliberately reserved for the worker integration in Task 23; the persisted `WAITING → PROMOTED | CANCELLED` state machine is ready for it.

Membership plans define a bounded basis-point discount and included credits. Active memberships and purchased package balances remain separate ledgers so recurring and prepaid entitlements can be audited independently.

Quotes select active tenant-wide and resource-specific rules whose optional time window contains the requested start. Rules are applied in priority order, additive dynamic adjustments are capped from −90% to +200%, then a membership discount capped at 90% is applied. The response explains every applied rule and available credits; it does not mutate balances.
