# Recurring availability engine

Rules are tenant-owned persistence records expressed as weekday, local start/end minutes, slot duration, effective dates, and an optional UTC offset for DST overlaps. The Go service accepts one local date and rule, validates all bounds, and returns UTC intervals with an explicit local label and zone.

DST gaps are skipped because the wall time never existed. DST overlaps fail unless the rule supplies the intended UTC offset. Invalid zones, dates, oversized bodies, durations, and offsets fail closed. Derived slots are not availability inventory; bookings and holds remain the authority.

The engine is deterministic and stateless, so it can be called in-process, over HTTP, or split for scaling without moving booking ownership out of PostgreSQL.
