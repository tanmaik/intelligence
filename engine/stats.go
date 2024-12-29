package engine

import (
	"fmt"
	"sort"
)

func LogTop5ByEditCount() {
	type pair struct {
		Title string
		Count int
	}
	var pairs []pair
	for title, count := range EditCounts {
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
	for title, total := range ByteChanges {
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
