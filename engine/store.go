package engine

var (
    AllEdits []FullChange
)

func AddEdit(change FullChange) {
    AllEdits = append(AllEdits, change)
}

