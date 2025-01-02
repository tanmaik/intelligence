package main

import (
    "encoding/json"
    "log"
    "net/http"
    "engine"
)

func main() {
    go engine.StartIngestion()

    http.HandleFunc("/analytics", func(w http.ResponseWriter, r *http.Request) {
        // e.g. query param ?granularity=1m
        gran := r.URL.Query().Get("granularity")
        if gran == "" {
            gran = "1m" // default
        }
        buckets := engine.GetTop5Articles(gran)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(buckets)
    })

    log.Println("Analytics server listening on :8000")
    http.ListenAndServe(":8000", nil)
}

