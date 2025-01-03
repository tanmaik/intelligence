// File: /Users/tanmai/Documents/perceptron/pulse/engine/spikes.go

package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// ArticleMetrics holds dynamic metrics we use for spike detection.
type ArticleMetrics struct {
	Title     string
	Edits     int       // number of edits so far (recent window)
	Bytes     int       // total bytes changed so far (recent window)
	LastEdit  time.Time // last edit timestamp
	InSpike   bool      // whether a spike is currently active for this article
	StartTime time.Time // when the current spike started, if any
}

// SpikePayload represents the data we send to the API
type SpikePayload struct {
	Title        string    `json:"title"`
	StartTime    time.Time `json:"startTime"`
	LastEditTime time.Time `json:"lastEditTime"`
	TotalEdits   int       `json:"totalEdits"`
	TotalBytes   int       `json:"totalBytes"`
	IsActive     bool      `json:"isActive"`
}

// allArticleMetrics tracks each article's metrics in memory.
var allArticleMetrics map[string]*ArticleMetrics

// Example weighting/threshold constants:
const (
	SPIKE_BYTES_THRESHOLD      = 10000           // If total bytes changed exceed this, consider a spike
	SPIKE_EDITS_THRESHOLD      = 15 // If total edits exceed this, consider a spike
	SPIKE_INACTIVITY_DURATION  = 30 * time.Minute // Only end spike after no edits for 10 minutes
	WEIGHT_BYTES              = 0.75           // Weight for bytes in the weighted score
	WEIGHT_EDITS              = 0.25           // Weight for edit count in the weighted score
	EDIT_COUNT_POINTS_PER_EDIT = 500            // Pseudo "points" for each edit
	SPIKE_API_ENDPOINT         = "http://localhost:8080/edits/spikes" // Update this with your actual endpoint
)

func init() {
	allArticleMetrics = make(map[string]*ArticleMetrics)
}

func UpdateArticleActivity(edit StoredEdit) {
	m, exists := allArticleMetrics[edit.Title]
	if !exists {
		m = &ArticleMetrics{Title: edit.Title}
		allArticleMetrics[edit.Title] = m
	}

	// Increment counters:
	m.Edits++
	byteDiff := abs(edit.LengthNew - edit.LengthOld)
	m.Bytes += byteDiff
	m.LastEdit = edit.Timestamp

	// Weighted score (example).
	weightedScore := (WEIGHT_BYTES * float64(m.Bytes)) +
		(WEIGHT_EDITS * float64(m.Edits*EDIT_COUNT_POINTS_PER_EDIT))

	// If we are not already in a spike, check conditions and log *why* the spike started.
	if !m.InSpike {
		var reason string

		// If raw bytes exceed threshold
		if float64(m.Bytes) > SPIKE_BYTES_THRESHOLD {
			reason = fmt.Sprintf("bytes changed exceeded threshold (%d > %d)", m.Bytes, SPIKE_BYTES_THRESHOLD)
		} else if m.Edits > SPIKE_EDITS_THRESHOLD {
			reason = fmt.Sprintf("edit count exceeded threshold (%d > %d)", m.Edits, SPIKE_EDITS_THRESHOLD)
		} else if weightedScore > float64(SPIKE_BYTES_THRESHOLD) {
			reason = fmt.Sprintf("weighted score exceeded threshold (%.1f > %.1f)", weightedScore, float64(SPIKE_BYTES_THRESHOLD))
		}

		if reason != "" {
			m.InSpike = true
			m.StartTime = edit.Timestamp // Record when the spike started
			// Now we also log the time of the last edit
			fmt.Printf(
				"[SPIKE START] Article '%s' triggered by %s\n  -> Weighted Score = %.1f\n  -> Last Edit Timestamp = %s\n",
				edit.Title,
				reason,
				weightedScore,
				m.LastEdit.Format("2006-01-02 15:04:05 MST"),
			)
			// Post to API
			postSpikeToAPI(m)
		}
	} else {
		// If already in spike, update the API with new metrics
		postSpikeToAPI(m)
	}
}

func postSpikeToAPI(m *ArticleMetrics) {
	payload := SpikePayload{
		Title:        m.Title,
		StartTime:    m.StartTime,
		LastEditTime: m.LastEdit,
		TotalEdits:   m.Edits,
		TotalBytes:   m.Bytes,
		IsActive:     m.InSpike,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		fmt.Printf("[ERROR] Failed to marshal spike data: %v\n", err)
		return
	}

	resp, err := http.Post(SPIKE_API_ENDPOINT, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("[ERROR] Failed to post spike data: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[ERROR] API returned non-200 status: %d\n", resp.StatusCode)
		return
	}
}

// CheckInactivity should be called periodically (e.g. once per minute).
// If an article is in a spike but hasn’t had any new edits for SPIKE_INACTIVITY_DURATION,
// we end the spike.
func CheckInactivity() {
	now := time.Now()
	for title, m := range allArticleMetrics {
		if m.InSpike {
			if now.Sub(m.LastEdit) > SPIKE_INACTIVITY_DURATION {
				m.InSpike = false
				// Optionally reset Edits/Bytes, if that fits your logic: (YES)
				m.Edits = 0
				m.Bytes = 0
				fmt.Printf("[SPIKE END] Article '%s' ended due to %v of inactivity.\n", title, SPIKE_INACTIVITY_DURATION)
				// Make final API call to mark spike as inactive
				postSpikeToAPI(m)
			}
		}
	}
}

func EndHistoricalSpikes() {
	now := time.Now()
	for title, m := range allArticleMetrics {
		if m.InSpike {
			if now.Sub(m.LastEdit) > SPIKE_INACTIVITY_DURATION {
				m.InSpike = false
				fmt.Printf("[SPIKE END] Article '%s' (historical) ended due to no activity in the last %v.\n",
					title, SPIKE_INACTIVITY_DURATION)
				// Make final API call to mark spike as inactive
				postSpikeToAPI(m)
			}
		}
	}
}

// IsInSpike can be used to quickly check if an article is in a spike.
func IsInSpike(title string) bool {
	m, found := allArticleMetrics[title]
	if !found {
		return false
	}
	return m.InSpike
}
