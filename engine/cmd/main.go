package main

import (
	"engine"
	"time"
)

func main() {
	go engine.StartIngestion()

	for {
		time.Sleep(5 * time.Second)
		// engine.LogTop5ByEditCount()
		// engine.LogTop5ByByteChanges()
	}
}
