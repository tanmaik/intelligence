package main

import (
	"engine"
	"time"
)

func main() {
    go engine.StartIngestion()
	for {
		time.Sleep(5 * time.Second)
	}
	// Create a SpikeTracker with threshold=5 and cooldown=2
	// spikeTracker := analytics.NewSpikeTracker(5, 2)

    // // Run MonitorSpikes periodically
    // ticker := time.NewTicker(5 * time.Second)
    // defer ticker.Stop()

    // // Instead of 'for { select {} }', use 'for range ticker.C'
    // for range ticker.C {
    //     spikeTracker.MonitorSpikes()
    // }
}
