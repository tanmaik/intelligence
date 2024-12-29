package engine

import (
	"fmt"
	"sort"
)

func copyMap(original map[string]int) map[string]int {
	copy := make(map[string]int, len(original))
	for k, v := range original {
		copy[k] = v
	}
	return copy
}

func LogTop5ByEditCount() {
	type pair struct {
		Title string
		Count int
	}
	var pairs []pair
	
	// Create a copy of the map to work with
	editCountsCopy := copyMap(EditCounts)
	
	for title, count := range editCountsCopy {
		pairs = append(pairs, pair{title, count})
	}

	sort.Slice(pairs, func(i, j int) bool {
		return pairs[i].Count > pairs[j].Count
	})

	fmt.Println("Top 5 articles by edit count:")
	for i := 0; i < 5 && i < len(pairs); i++ {
		fmt.Printf("%d) %s => %d edits\n", i+1, pairs[i].Title, pairs[i].Count)
	}
}

func LogTop5ByByteChanges() {
	type pair struct {
		Title string
		Total int
	}
	var pairs []pair
	
	// Create a copy of the map to work with
	byteChangesCopy := copyMap(ByteChanges)
	
	for title, total := range byteChangesCopy {
		pairs = append(pairs, pair{title, total})
	}

	sort.Slice(pairs, func(i, j int) bool {
		return pairs[i].Total > pairs[j].Total
	})

	fmt.Println("Top 5 articles by total byte changes:")
	for i := 0; i < 5 && i < len(pairs); i++ {
		fmt.Printf("%d) %s => %d bytes changed\n", i+1, pairs[i].Title, pairs[i].Total)
	}
}
