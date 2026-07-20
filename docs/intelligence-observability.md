# Recommendations, analytics, observability, and accessibility

## Design and acceptance

The canonical availability engine supplies candidate slots; Gemini may only rank those IDs and provide short explanations. It cannot invent availability, change prices, or receive customer identity. Every response is schema-validated, must contain every candidate exactly once, and falls back to deterministic earliest/lowest-price ordering on timeout or malformed output.

Product analytics accepts a fixed event allowlist and hashes the browser session identifier before persistence. It rejects arbitrary event names and properties, preventing accidental customer-content collection. Tenant summaries require the admin credential and use a 1–90 day bounded window.

Operator metrics require a separate bearer token. Labels are bounded enums/adapter states rather than customer, booking, or resource identifiers. Alerts should cover API 5xx rate, hold conflicts, payment signature failures, outbox age/failures, Gemini fallback rate, and database saturation.

## Accessibility review

The web experience has a keyboard-visible skip link, strong focus indicators, live status announcements, semantic labels and time elements, reduced-motion handling, disabled-state cues, and text explanations alongside recommendations. Before a public release, run automated WCAG checks and manual keyboard, zoom, screen-reader, contrast, and error-recovery reviews on all pages.
