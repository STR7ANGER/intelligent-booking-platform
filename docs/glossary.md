# Domain glossary

- Organization: tenant and authorization boundary.
- Location: physical or virtual venue with one IANA time zone.
- Resource: bookable court, room, desk, or equipment at a location.
- Provider: staff member whose working calendar may constrain availability.
- Availability rule: recurring local-time window with effective dates.
- Slot: derived UTC interval, not an inventory row by itself.
- Hold: short-lived exclusive claim coordinated in Redis.
- Booking: durable PostgreSQL reservation created transactionally.
