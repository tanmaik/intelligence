package engine

import (
    "fmt"
    "sync"
    "time"
)

type TimeBucket struct {
StartTime  time.Time `json:"startTime"`
    EndTime    time.Time `json:"endTime"`
    Article    string    `json:"article"`
    EditVolume int       `json:"editVolume"`
}

var (
    Mu                sync.RWMutex
    Buckets1m         []TimeBucket
    Buckets5m         []TimeBucket
    Buckets1h         []TimeBucket
    Buckets6h         []TimeBucket
)

// We'll define a factor to scale # of edits vs. byte changes if you prefer
const ByteWeight = 1
const EditWeight = 1

func IngestEditForAnalytics(edit StoredEdit) {
    Mu.Lock()
    defer Mu.Unlock()

   
  
    roundTime1m := edit.Timestamp.Truncate(time.Minute)
 
    addToBucket(&Buckets1m, roundTime1m, roundTime1m.Add(time.Minute), edit)


    roundTime5m := edit.Timestamp.Truncate(5 * time.Minute)
    addToBucket(&Buckets5m, roundTime5m, roundTime5m.Add(5*time.Minute), edit)

    roundTime1h := edit.Timestamp.Truncate(time.Hour)
    addToBucket(&Buckets1h, roundTime1h, roundTime1h.Add(time.Hour), edit)

    roundTime6h := edit.Timestamp.Truncate(6 * time.Hour)
    addToBucket(&Buckets6h, roundTime6h, roundTime6h.Add(6*time.Hour), edit)
}


func addToBucket(collection *[]TimeBucket, start, end time.Time, edit StoredEdit) {
    volumeContribution := EditWeight + ByteWeight*abs(edit.LengthNew - edit.LengthOld)


    for i := range *collection {
        if (*collection)[i].StartTime == start &&
            (*collection)[i].EndTime == end &&
            (*collection)[i].Article == edit.Title {

            (*collection)[i].EditVolume += volumeContribution
            return
        }
    }


    newBucket := TimeBucket{
        StartTime:  start,
        EndTime:    end,
        Article:    edit.Title,
        EditVolume: volumeContribution,
    }
    *collection = append(*collection, newBucket)
}


func GetTop5Articles(granularity string) []TimeBucket {
    Mu.RLock()
    defer Mu.RUnlock()

    var source []TimeBucket
    switch granularity {
    case "1m":
        source = Buckets1m
    case "5m":
        source = Buckets5m
    case "1h":
        source = Buckets1h
    case "6h":
        source = Buckets6h
    default:
        return []TimeBucket{}
    }

    sorted := sortBuckets(source)

    return sorted
}

// Sorting logic
func sortBuckets(buckets []TimeBucket) []TimeBucket {
    dup := make([]TimeBucket, len(buckets))
    copy(dup, buckets)
    // your custom sorting logic here
    // or import "sort" and do something like:
    //   sort.Slice(dup, func(i,j int) bool { ... })
    // for brevity, we'll keep it simple:
    // sort by StartTime ascending, then by -EditVolume
    // ...
    return dup
}

func init() {
    fmt.Println("analytics.go initialized")
}

