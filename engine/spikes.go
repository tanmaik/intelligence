// File: /Users/tanmai/Documents/perceptron/pulse/engine/spikes.go

package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ArticleMetrics holds dynamic metrics we use for spike detection.
type ArticleMetrics struct {
	Title    string
	Edits    int       // number of edits so far (recent window)
	Bytes    int       // total bytes changed so far (recent window)
	LastEdit time.Time // last edit timestamp
	InSpike  bool      // whether a spike is currently active for this article
}

// SpikePayload represents the data we send to the Node.js server
type SpikePayload struct {
	Title        string    `json:"title"`
	StartTime    time.Time `json:"startTime"`
	LastEditTime time.Time `json:"lastEditTime"`
	TotalEdits   int       `json:"totalEdits"`
	TotalBytes   int       `json:"totalBytes"`
	IsActive     bool      `json:"isActive"`
	FirstEditId  int       `json:"firstEditId"`
	LastEditId   int       `json:"lastEditId"`
}

// NodeServerURL is the URL of our Node.js server
const NodeServerURL = "http://localhost:8080"

// allArticleMetrics tracks each article's metrics in memory.
var allArticleMetrics map[string]*ArticleMetrics

// Example weighting/threshold constants:
const (
	SPIKE_BYTES_THRESHOLD     = 4000           // If total bytes changed exceed this, consider a spike
	SPIKE_EDITS_THRESHOLD     = 5              // If total edits exceed this, consider a spike
	SPIKE_INACTIVITY_DURATION = 30 * time.Minute // Only end spike after no edits for 10 minutes
	WEIGHT_BYTES             = 0.75           // Weight for bytes in the weighted score
	WEIGHT_EDITS             = 0.25           // Weight for edit count in the weighted score
	EDIT_COUNT_POINTS_PER_EDIT = 500            // Pseudo "points" for each edit
)

func init() {
	allArticleMetrics = make(map[string]*ArticleMetrics)
}

// notifyNodeServer sends spike data to our Node.js server
func notifyNodeServer(payload SpikePayload) error {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("error marshaling spike data: %v", err)
	}

	endpoint := fmt.Sprintf("%s/edits/spikes", NodeServerURL)
	resp, err := http.Post(endpoint, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("error sending spike data: %v", err)
	}
	defer resp.Body.Close()

	// Read and log the response body for debugging
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("error reading response body: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	fmt.Printf("[DEBUG] Node.js server response: %s\n", string(body))
	return nil
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
			// Notify Node.js server about new spike
			payload := SpikePayload{
				Title:        edit.Title,
				StartTime:    m.LastEdit,
				LastEditTime: m.LastEdit,
				TotalEdits:   m.Edits,
				TotalBytes:   m.Bytes,
				IsActive:     true,
				FirstEditId:  edit.ID,
				LastEditId:   edit.ID,
			}
			if err := notifyNodeServer(payload); err != nil {
				fmt.Printf("Error notifying Node.js server about spike start: %v\n", err)
			}

			fmt.Printf(
				"[SPIKE START] Article '%s' triggered by %s\n  -> Weighted Score = %.1f\n  -> Last Edit Timestamp = %s\n",
				edit.Title,
				reason,
				weightedScore,
				m.LastEdit.Format("2006-01-02 15:04:05 MST"),
			)
		}
	} else {
		// Update the last edit ID for ongoing spikes
		payload := SpikePayload{
			Title:        edit.Title,
			StartTime:    m.LastEdit,
			LastEditTime: edit.Timestamp,
			TotalEdits:   m.Edits,
			TotalBytes:   m.Bytes,
			IsActive:     true,
			FirstEditId:  edit.ID, // You might want to store the first edit ID somewhere
			LastEditId:   edit.ID,
		}
		if err := notifyNodeServer(payload); err != nil {
			fmt.Printf("Error notifying Node.js server about spike update: %v\n", err)
		}
	}
}

// CheckInactivity should be called periodically (e.g. once per minute).
func CheckInactivity() {
	now := time.Now()
	for title, m := range allArticleMetrics {
		if m.InSpike {
			if now.Sub(m.LastEdit) > SPIKE_INACTIVITY_DURATION {
				m.InSpike = false
				// Notify Node.js server about spike end
				payload := SpikePayload{
					Title:        title,
					StartTime:    m.LastEdit,
					LastEditTime: now,
					TotalEdits:   m.Edits,
					TotalBytes:   m.Bytes,
					IsActive:     false,
				}
				if err := notifyNodeServer(payload); err != nil {
					fmt.Printf("Error notifying Node.js server about spike end: %v\n", err)
				}

				// Optionally reset Edits/Bytes
				m.Edits = 0
				m.Bytes = 0
				fmt.Printf("[SPIKE END] Article '%s' ended due to %v of inactivity.\n", title, SPIKE_INACTIVITY_DURATION)
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
				// Notify Node.js server about historical spike end
				payload := SpikePayload{
					Title:        title,
					StartTime:    m.LastEdit,
					LastEditTime: now,
					TotalEdits:   m.Edits,
					TotalBytes:   m.Bytes,
					IsActive:     false,
				}
				if err := notifyNodeServer(payload); err != nil {
					fmt.Printf("Error notifying Node.js server about historical spike end: %v\n", err)
				}

				fmt.Printf("[SPIKE END] Article '%s' (historical) ended due to no activity in the last %v.\n",
					title, SPIKE_INACTIVITY_DURATION)
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
