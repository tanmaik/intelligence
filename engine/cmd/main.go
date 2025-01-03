package main

import (
	"engine"
	"time"
)

func main() {
	go func() {
		for {
			time.Sleep(1 * time.Minute)
			engine.CheckInactivity()
		}
	}()

  go engine.StartIngestion()
	for {
		time.Sleep(5 * time.Second)
	}
}
