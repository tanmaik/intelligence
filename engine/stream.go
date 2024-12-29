package engine

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

type FullChange struct {
	Schema string `json:"$schema"`
	Meta   struct {
		URI       string `json:"uri"`
		RequestID string `json:"request_id"`
		ID        string `json:"id"`
		DT        string `json:"dt"`
		Domain    string `json:"domain"`
		Stream    string `json:"stream"`
		Topic     string `json:"topic"`
		Partition int    `json:"partition"`
		Offset    int    `json:"offset"`
	} `json:"meta"`
	ID        int    `json:"id"`
	Type      string `json:"type"`
	Namespace int    `json:"namespace"`
	Title     string `json:"title"`
	TitleURL  string `json:"title_url"`
	Comment   string `json:"comment"`
	Timestamp int    `json:"timestamp"`
	User      string `json:"user"`
	Bot       bool   `json:"bot"`
	NotifyURL string `json:"notify_url"`
	Minor     bool   `json:"minor"`
	Length    struct {
		Old int `json:"old"`
		New int `json:"new"`
	} `json:"length"`
	Revision struct {
		Old int `json:"old"`
		New int `json:"new"`
	} `json:"revision"`
	ServerURL     string `json:"server_url"`
	ServerName    string `json:"server_name"`
	ServerPath    string `json:"server_script_path"`
	Wiki          string `json:"wiki"`
	ParsedComment string `json:"parsedcomment"`
}

type StoredEdit struct {
	ID        int       `json:"id"`
	Title     string    `json:"title"`
	TitleURL  string    `json:"titleUrl"`
	Comment   string    `json:"comment"`
	Timestamp time.Time `json:"timestamp"`
	User      string    `json:"user"`
	Bot       bool      `json:"bot"`
	NotifyURL string    `json:"notifyUrl"`
	Minor     bool      `json:"minor"`
	LengthOld int       `json:"lengthOld"`
	LengthNew int       `json:"lengthNew"`
	ServerURL string    `json:"serverUrl"`
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func fetchHistoricalEdits() ([]StoredEdit, error) {
	baseURL := os.Getenv("API_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}

	resp, err := http.Get(baseURL + "/edits")
	if err != nil {
		return nil, fmt.Errorf("error fetching historical edits: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %v", err)
	}

	var edits []StoredEdit
	if err := json.Unmarshal(body, &edits); err != nil {
		return nil, fmt.Errorf("error parsing JSON: %v", err)
	}

	return edits, nil
}

func StartIngestion() {
	fmt.Println("Fetching historical edits...")
	historicalEdits, err := fetchHistoricalEdits()
	if err != nil {
		log.Printf("Error fetching historical edits: %v", err)
	} else {
		processedCount := 0
		for _, edit := range historicalEdits {
			if !strings.Contains(edit.Title, ":") {
				EditCounts[edit.Title]++
				byteDiff := abs(edit.LengthNew - edit.LengthOld)
				ByteChanges[edit.Title] += byteDiff
				processedCount++
			}
		}
		fmt.Printf("Processed %d historical edits\n", processedCount)
	}

	fmt.Println("Connecting to live stream...")
	url := "https://stream.wikimedia.org/v2/stream/recentchange"
	resp, err := http.Get(url)
	if err != nil {
		log.Fatalf("Error connecting to stream: %v", err)
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Bytes()
		if !bytes.HasPrefix(line, []byte("data: ")) {
			continue
		}
		line = bytes.TrimPrefix(line, []byte("data: "))

		// Validate JSON before processing
		if !json.Valid(line) {
			continue
		}

		var change FullChange
		if err := json.Unmarshal(line, &change); err != nil {
			continue
		}

		// Validate required fields
		if change.Meta.Domain == "" || change.Title == "" || change.Length.New == 0 {
			continue
		}

		if change.Meta.Domain == "en.wikipedia.org" && !strings.Contains(change.Title, ":") {
			EditCounts[change.Title]++
			byteDiff := abs(change.Length.New - change.Length.Old)
			ByteChanges[change.Title] += byteDiff
			fmt.Printf("edit #%d: %s (%d B)\n", EditCounts[change.Title], change.Title, ByteChanges[change.Title])
		}
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("Error with stream: %v", err)
	}
}
