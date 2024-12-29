package analytics

import (
	"fmt"
	"sync"
	"time"

	// Adjust this import to your actual module path if needed
	"engine"
)

// SpikeTracker holds data for detecting and tracking spikes per article.
type SpikeTracker struct {
    mu sync.Mutex
    // inSpike tracks whether an article is currently considered in a spike
    inSpike map[string]bool
    // lastEditCount holds the last known edit count for each article
    lastEditCount map[string]int
    // spikeStartTime records when we detected a spike for logging/analysis
    spikeStartTime map[string]time.Time

    // threshold is the difference in edit count that triggers a spike
    threshold int
    // cooldown is how many cycles the activity must remain below threshold
    // before we consider the spike "ended"
    cooldown int
    // cooldownCounter counts how many consecutive cycles we've seen normal activity
    cooldownCounter map[string]int
}

// NewSpikeTracker returns an initialized SpikeTracker with default or configurable settings.
func NewSpikeTracker(threshold, cooldown int) *SpikeTracker {
    return &SpikeTracker{
        inSpike:        make(map[string]bool),
        lastEditCount:  make(map[string]int),
        spikeStartTime: make(map[string]time.Time),
        threshold:      threshold,
        cooldown:       cooldown,
        cooldownCounter: make(map[string]int),
    }
}

// MonitorSpikes checks for spikes in edit activity.
// Call this periodically (e.g., via a ticker in your main.go).
func (st *SpikeTracker) MonitorSpikes() {
    st.mu.Lock()
    defer st.mu.Unlock()

    // Iterate through each article’s current EditCounts
    for article, currentCount := range engine.EditCounts {
        // Retrieve the last known count; if none found, default to zero
        lastCount, ok := st.lastEditCount[article]
        if !ok {
            st.lastEditCount[article] = currentCount
            continue
        }

        // Check the delta between the current and the last known count
        delta := currentCount - lastCount

        // If we’re already in a spike, determine if it has ended
        if st.inSpike[article] {
            if delta < st.threshold {
                // Not above threshold this time
                st.cooldownCounter[article]++
                if st.cooldownCounter[article] >= st.cooldown {
                    // End the spike
                    fmt.Printf("[SPIKE ENDED] Article: %s, Duration: %s\n",
                        article,
                        time.Since(st.spikeStartTime[article]).String(),
                    )
                    st.inSpike[article] = false
                    st.cooldownCounter[article] = 0
                }
            } else {
                // Still above threshold, reset cooldown
                st.cooldownCounter[article] = 0
            }
        } else {
            // Not currently in a spike, see if the new delta triggers one
            if delta >= st.threshold {
                st.inSpike[article] = true
                st.spikeStartTime[article] = time.Now()
                fmt.Printf("[SPIKE STARTED] Article: %s, Delta: %d\n", article, delta)
            }
        }

        // Update the last known count to the current
        st.lastEditCount[article] = currentCount
    }
}
