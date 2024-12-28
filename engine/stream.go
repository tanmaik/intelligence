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

type Change struct {
	Meta struct {
		Domain string `json:"domain"`
	} `json:"meta"`
	Title string `json:"title"`
	User  string `json:"user"`
	Type  string `json:"type"`
}

func main() {
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

		var change Change
		if err := json.Unmarshal(line, &change); err != nil {
			log.Printf("err decoding event: %v", err)
			continue
		}
		

		if change.Meta.Domain == "en.wikipedia.org" && !strings.Contains(change.Title, ":") {
			fmt.Printf("edit: %s\n", change.Title)
		}
	}

	if err := scanner.Err(); err != nil {
		log.Fatalf("err w/ stream: %v", err)
	}
}

