package main

import (
	"encoding/json"
	"github.com/STR7ANGER/intelligent-booking-platform/availability/internal/slots"
	"log"
	"net/http"
	"os"
	"time"
)

type request struct {
	Date string     `json:"date"`
	Rule slots.Rule `json:"rule"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "availability"})
	})
	mux.HandleFunc("POST /v1/slots", func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
		var input request
		if json.NewDecoder(r.Body).Decode(&input) != nil {
			http.Error(w, "invalid request", 400)
			return
		}
		date, err := time.Parse("2006-01-02", input.Date)
		if err != nil {
			http.Error(w, "invalid date", 400)
			return
		}
		result, err := slots.Generate(date, input.Rule)
		if err != nil {
			http.Error(w, err.Error(), 422)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"slots": result})
	})
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("availability listening on %s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}
