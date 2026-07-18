package slots

import (
	"errors"
	"testing"
	"time"
)

func date(value string) time.Time { parsed, _ := time.Parse("2006-01-02", value); return parsed }
func TestGeneratesDeterministicUTCSlots(t *testing.T) {
	slots, err := Generate(date("2026-07-20"), Rule{Weekday: time.Monday, StartMinute: 540, EndMinute: 660, SlotMinutes: 60, TimeZone: "Asia/Kolkata"})
	if err != nil || len(slots) != 2 {
		t.Fatalf("unexpected result: %v %v", slots, err)
	}
	if slots[0].StartsAtUTC != "2026-07-20T03:30:00Z" {
		t.Fatalf("wrong UTC: %s", slots[0].StartsAtUTC)
	}
}
func TestSkipsSpringForwardGap(t *testing.T) {
	slots, err := Generate(date("2026-03-08"), Rule{Weekday: time.Sunday, StartMinute: 120, EndMinute: 180, SlotMinutes: 30, TimeZone: "America/New_York"})
	if err != nil {
		t.Fatal(err)
	}
	if len(slots) != 0 {
		t.Fatalf("expected gap to be skipped: %v", slots)
	}
}
func TestRequiresOffsetForFallOverlap(t *testing.T) {
	rule := Rule{Weekday: time.Sunday, StartMinute: 60, EndMinute: 90, SlotMinutes: 30, TimeZone: "America/New_York"}
	_, err := Generate(date("2026-11-01"), rule)
	if !errors.Is(err, ErrAmbiguousTime) {
		t.Fatalf("expected ambiguity: %v", err)
	}
	offset := -300
	rule.UTCOffsetMinutes = &offset
	slots, err := Generate(date("2026-11-01"), rule)
	if err != nil || len(slots) != 1 {
		t.Fatalf("offset should resolve: %v %v", slots, err)
	}
}
func TestRejectsInvalidRules(t *testing.T) {
	_, err := Generate(date("2026-07-20"), Rule{Weekday: time.Monday, StartMinute: 600, EndMinute: 500, SlotMinutes: 30, TimeZone: "UTC"})
	if err == nil {
		t.Fatal("expected validation error")
	}
}
