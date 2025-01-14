package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

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

// spikeQueue is a channel for queuing spike updates
var spikeQueue chan *ArticleMetrics

// Example weighting/threshold constants:
const (
	SPIKE_WEIGHTED_THRESHOLD    = 5000            // Combined threshold for weighted score
	SPIKE_INACTIVITY_DURATION  = 10 * time.Minute // Only end spike after no edits for 10 minutes
	WEIGHT_BYTES               = 0.2              // Lower weight for bytes in the weighted score
	WEIGHT_EDITS               = 0.8              // Higher weight for edit count in the weighted score
	EDIT_COUNT_POINTS_PER_EDIT = 500             // Pseudo "points" for each edit
)

var SPIKE_API_ENDPOINT string

func init() {
	allArticleMetrics = make(map[string]*ArticleMetrics)
	// Initialize the spike queue with a reasonable buffer size
	spikeQueue = make(chan *ArticleMetrics, 1000)
	// Start the background worker
	go processSpikeQueue()

	// Set the SPIKE_API_ENDPOINT based on the API_BASE_URL environment variable
	baseURL := os.Getenv("API_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	SPIKE_API_ENDPOINT = baseURL + "/wiki/edits/spikes"
}

// processSpikeQueue runs in the background and processes queued spike updates
func processSpikeQueue() {
	for metrics := range spikeQueue {
		payload := SpikePayload{
			Title:        metrics.Title,
			StartTime:    metrics.StartTime,
			LastEditTime: metrics.LastEdit,
			TotalEdits:   metrics.Edits,
			TotalBytes:   metrics.Bytes,
			IsActive:     metrics.InSpike,
		}

		jsonData, err := json.Marshal(payload)
		if err != nil {
			fmt.Printf("[ERROR] Failed to marshal spike data: %v\n", err)
			continue
		}

		resp, err := http.Post(SPIKE_API_ENDPOINT, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			fmt.Printf("[ERROR] Failed to post spike data: %v\n", err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			fmt.Printf("[ERROR] API returned non-200 status: %d\n", resp.StatusCode)
		}
		resp.Body.Close()
	}
}

// queueSpikeUpdate adds a spike update to the processing queue
func queueSpikeUpdate(m *ArticleMetrics) {
	select {
	case spikeQueue <- m:
		// Successfully queued
	default:
		// Queue is full, log error but don't block
		fmt.Printf("[ERROR] Spike queue is full, dropping update for article '%s'\n", m.Title)
	}
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
		// Only use weighted score for spike detection
		if weightedScore > float64(SPIKE_WEIGHTED_THRESHOLD) {
			m.InSpike = true
			m.StartTime = edit.Timestamp // Record when the spike started
			fmt.Printf(
				"[SPIKE START] Article '%s' triggered by weighted score (%.1f > %.1f)\n  -> Edits: %d, Bytes: %d\n  -> Last Edit Timestamp = %s\n",
				edit.Title,
				weightedScore,
				float64(SPIKE_WEIGHTED_THRESHOLD),
				m.Edits,
				m.Bytes,
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
	// Instead of making the HTTP request directly, queue it
	queueSpikeUpdate(m)
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
				// m.Edits = 0
				// m.Bytes = 0
				fmt.Printf("[SPIKE END] Article '%s' ended due to %v of inactivity.\n", title, SPIKE_INACTIVITY_DURATION)
				// Make final API call to mark spike as inactive
				postSpikeToAPI(m)
				// TODO: reset metrics
				m.Edits = 0
				m.Bytes = 0
				// TODO: reset spike metrics
				m.InSpike = false
				m.StartTime = time.Time{}

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
