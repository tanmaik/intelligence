package engine

import "time"

type StoredEdit struct {
    ID        int
    Title     string
    TitleURL  string
    Comment   string
    Timestamp time.Time
    User      string
    Bot       bool
    NotifyURL string
    Minor     bool
    LengthOld int
    LengthNew int
    ServerURL string
}

var AllEdits []StoredEdit
var ArticleEditCounts map[string]int
var ArticleBytesChanged map[string]int

func init() {
    ArticleEditCounts = make(map[string]int)
    ArticleBytesChanged = make(map[string]int)
}

func AddEdit(edit StoredEdit) int {
    AllEdits = append(AllEdits, edit)
    ArticleEditCounts[edit.Title]++
    byteDiff := abs(edit.LengthNew - edit.LengthOld)
    ArticleBytesChanged[edit.Title] += byteDiff
    return len(AllEdits)
}

func GetEditCount(title string) int {
    return ArticleEditCounts[title]
}

func GetTotalBytesChanged(title string) int {
    return ArticleBytesChanged[title]
}

