package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
)

// FullChange represents the entire edit event structure from Wikimedia EventStream
type FullChange struct {
	Schema      string `json:"$schema"`
	Meta        struct {
		URI      string `json:"uri"`
		RequestID string `json:"request_id"`
		ID       string `json:"id"`
		DT       string `json:"dt"`
		Domain   string `json:"domain"`
		Stream   string `json:"stream"`
		Topic    string `json:"topic"`
		Partition int    `json:"partition"`
		Offset   int    `json:"offset"`
	} `json:"meta"`
	ID          int    `json:"id"`
	Type        string `json:"type"`
	Namespace   int    `json:"namespace"`
	Title       string `json:"title"`
	TitleURL    string `json:"title_url"`
	Comment     string `json:"comment"`
	Timestamp   int    `json:"timestamp"`
	User        string `json:"user"`
	Bot         bool   `json:"bot"`
	NotifyURL   string `json:"notify_url"`
	Minor       bool   `json:"minor"`
	Length      struct {
		Old int `json:"old"`
		New int `json:"new"`
	} `json:"length"`
	Revision    struct {
		Old int `json:"old"`
		New int `json:"new"`
	} `json:"revision"`
	ServerURL   string `json:"server_url"`
	ServerName  string `json:"server_name"`
	ServerPath  string `json:"server_script_path"`
	Wiki        string `json:"wiki"`
	ParsedComment string `json:"parsedcomment"`
}

func main() {
	url := "https://stream.wikimedia.org/v2/stream/recentchange"
	resp, err := http.Get(url)
	if err != nil {
		log.Fatalf("Error connecting to stream: %v", err)
	}
	defer resp.Body.Close()

	edits := make([]FullChange, 0) // Array to store full edit events

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Bytes()
		if !bytes.HasPrefix(line, []byte("data: ")) {
			continue
		}
		line = bytes.TrimPrefix(line, []byte("data: "))

		var change FullChange
		if err := json.Unmarshal(line, &change); err != nil {
			log.Printf("Error decoding event: %v", err)
			continue
		}

		// Filter for English Wikipedia and exclude special pages
		if change.Meta.Domain == "en.wikipedia.org" && !strings.Contains(change.Title, ":") {
			edits = append(edits, change) // Save the full edit event to memory
			fmt.Printf("edit: %s\n", change.Title)
		}
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("Error with stream: %v", err)
	}
}

