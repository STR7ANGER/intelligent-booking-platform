package slots

import (
	"errors"
	"fmt"
	"time"
)

var ErrAmbiguousTime = errors.New("ambiguous local time requires utcOffsetMinutes")

type Rule struct {
	Weekday          time.Weekday `json:"weekday"`
	StartMinute      int          `json:"startMinute"`
	EndMinute        int          `json:"endMinute"`
	SlotMinutes      int          `json:"slotMinutes"`
	TimeZone         string       `json:"timeZone"`
	UTCOffsetMinutes *int         `json:"utcOffsetMinutes,omitempty"`
}

type Slot struct {
	StartsAtUTC string `json:"startsAtUtc"`
	EndsAtUTC   string `json:"endsAtUtc"`
	LocalLabel  string `json:"localLabel"`
	TimeZone    string `json:"timeZone"`
}

func Generate(date time.Time, rule Rule) ([]Slot, error) {
	if rule.StartMinute < 0 || rule.EndMinute > 1440 || rule.StartMinute >= rule.EndMinute || rule.SlotMinutes < 5 || rule.SlotMinutes > 720 {
		return nil, errors.New("invalid availability rule")
	}
	location, err := time.LoadLocation(rule.TimeZone)
	if err != nil {
		return nil, fmt.Errorf("invalid time zone: %w", err)
	}
	if date.Weekday() != rule.Weekday {
		return []Slot{}, nil
	}
	result := make([]Slot, 0)
	for minute := rule.StartMinute; minute+rule.SlotMinutes <= rule.EndMinute; minute += rule.SlotMinutes {
		start, missing, err := resolve(date, minute, location, rule.UTCOffsetMinutes)
		if err != nil {
			return nil, err
		}
		end, endMissing, err := resolve(date, minute+rule.SlotMinutes, location, rule.UTCOffsetMinutes)
		if err != nil {
			return nil, err
		}
		if missing || endMissing {
			continue
		}
		result = append(result, Slot{StartsAtUTC: start.UTC().Format(time.RFC3339), EndsAtUTC: end.UTC().Format(time.RFC3339), LocalLabel: start.Format("2006-01-02 15:04 MST"), TimeZone: rule.TimeZone})
	}
	return result, nil
}

func resolve(date time.Time, minute int, location *time.Location, offset *int) (time.Time, bool, error) {
	hour, remainder := minute/60, minute%60
	candidate := time.Date(date.Year(), date.Month(), date.Day(), hour, remainder, 0, 0, location)
	local := candidate.In(location)
	if local.Hour() != hour || local.Minute() != remainder || local.Day() != date.Day() {
		return time.Time{}, true, nil
	}
	candidates := []time.Time{candidate}
	for _, alternative := range []time.Time{candidate.Add(-time.Hour), candidate.Add(time.Hour)} {
		wall := alternative.In(location)
		if wall.Year() == date.Year() && wall.Month() == date.Month() && wall.Day() == date.Day() && wall.Hour() == hour && wall.Minute() == remainder {
			candidates = append(candidates, alternative)
		}
	}
	if len(candidates) > 1 && offset == nil {
		return time.Time{}, false, ErrAmbiguousTime
	}
	if offset != nil {
		for _, value := range candidates {
			_, seconds := value.Zone()
			if seconds/60 == *offset {
				return value, false, nil
			}
		}
		return time.Time{}, false, errors.New("utcOffsetMinutes does not match local time")
	}
	return candidate, false, nil
}
