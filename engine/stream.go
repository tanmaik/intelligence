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



func printProgressBar(progress float64, barWidth int) {
	// Convert the progress (0-100) to an integer representing the number of filled sections
	filled := int((progress / 100.0) * float64(barWidth))
	if filled > barWidth {
		filled = barWidth
	}

	// Create the bar string
	bar := strings.Repeat("=", filled) + strings.Repeat(" ", barWidth-filled)

	// Print (with carriage return) so we overwrite on the same line
	fmt.Printf("\r[%s] %.2f%%", bar, progress)

	// When we reach 100%, print a newline
	if progress >= 100.0 {
		fmt.Println()
	}
}



func StartIngestion() {
	fmt.Println("Fetching historical edits...")
	historicalEdits, err := fetchHistoricalEdits()
	if err != nil {
		log.Printf("Error fetching historical edits: %v", err)
	} else {
		totalEdits := len(historicalEdits)
		processedCount := 0
		for i, edit := range historicalEdits {
			if !strings.Contains(edit.Title, ":") {
				AddEdit(edit)
				IngestEditForAnalytics(edit)
				processedCount++
			}
			progress := float64(i+1) / float64(totalEdits) * 100
			printProgressBar(progress, 40) // 40 = width of the progress bar
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

		if !json.Valid(line) {
			continue
		}

		var data map[string]interface{}
		if err := json.Unmarshal(line, &data); err != nil {
			continue
		}

		metaVal, ok := data["meta"].(map[string]interface{})
		if !ok {
			continue
		}

		domain, _ := metaVal["domain"].(string)
		if domain != "en.wikipedia.org" {
			continue
		}

		evtType, _ := data["type"].(string)
		if evtType != "edit" {
			continue
		}

		title, _ := data["title"].(string)
		if title == "" || strings.Contains(title, ":") {
			continue
		}

		idFloat, _ := data["id"].(float64)
		id := int(idFloat)

		titleURL, _ := data["title_url"].(string)
		comment, _ := data["comment"].(string)

		tsFloat, _ := data["timestamp"].(float64)
		tsTime := time.Unix(int64(tsFloat), 0)

		user, _ := data["user"].(string)
		bot, _ := data["bot"].(bool)
		notifyURL, _ := data["notify_url"].(string)
		minor, _ := data["minor"].(bool)

		lengthMap, _ := data["length"].(map[string]interface{})
		oldLenFloat, _ := lengthMap["old"].(float64)
		newLenFloat, _ := lengthMap["new"].(float64)
		lengthOld := int(oldLenFloat)
		lengthNew := int(newLenFloat)

		serverURL, _ := data["server_url"].(string)

		storedEdit := StoredEdit{
			ID:        id,
			Title:     title,
			TitleURL:  titleURL,
			Comment:   comment,
			Timestamp: tsTime,
			User:      user,
			Bot:       bot,
			NotifyURL: notifyURL,
			Minor:     minor,
			LengthOld: lengthOld,
			LengthNew: lengthNew,
			ServerURL: serverURL,
		}

		AddEdit(storedEdit)
	        IngestEditForAnalytics(storedEdit)
		byteDiff := abs(lengthNew - lengthOld)
		editCount := GetEditCount(title)
		totalBytesChanged := GetTotalBytesChanged(title)
		fmt.Printf("edit #%d: %s (%d B now, %d B total)\n",
			editCount, title, byteDiff, totalBytesChanged)
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("Error with stream: %v", err)
	}
}
