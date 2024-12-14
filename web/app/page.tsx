"use client";
import { useEffect, useState } from "react";

interface ArticleStats {
  count: number;
  recentEdits: number[];
  byteChanges: number;
  score: number;
}

const articleStats = new Map<string, ArticleStats>();

const MAX_LEADERBOARD_SIZE = 10;

// Scoring weights
const EDIT_COUNT_WEIGHT = 0.6; // 60% weight to edit frequency
const BYTE_CHANGE_WEIGHT = 0.4; // 40% weight to cumulative byte changes

type SortType = "bytes" | "score" | "edits";

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<[string, ArticleStats][]>([]);
  const [sortType, setSortType] = useState<SortType>("score");

  const calculateScore = (stats: ArticleStats) => {
    const normalizedEdits = stats.recentEdits.length;
    const normalizedBytes = Math.abs(stats.byteChanges) / 1000; // Normalize byte changes to thousands
    return (
      normalizedEdits * EDIT_COUNT_WEIGHT + normalizedBytes * BYTE_CHANGE_WEIGHT
    );
  };

  // Move sorting logic to a separate function to avoid duplication
  const getSortedArticles = (
    articles: Map<string, ArticleStats>,
    type: SortType
  ) => {
    const sortedArticles = Array.from(articles.entries()).map(
      ([title, stats]) => {
        stats.score = calculateScore(stats);
        return [title, stats] as [string, ArticleStats];
      }
    );

    switch (type) {
      case "bytes":
        return sortedArticles.sort((a, b) => {
          const bytesDiff =
            Math.abs(b[1].byteChanges) - Math.abs(a[1].byteChanges);
          return bytesDiff !== 0 ? bytesDiff : b[1].score - a[1].score;
        });
      case "score":
        return sortedArticles.sort((a, b) => b[1].score - a[1].score);
      case "edits":
        return sortedArticles.sort((a, b) => {
          const editsDiff = b[1].recentEdits.length - a[1].recentEdits.length;
          return editsDiff !== 0 ? editsDiff : b[1].score - a[1].score;
        });
      default:
        return sortedArticles;
    }
  };

  // Update leaderboard whenever sortType changes
  useEffect(() => {
    setLeaderboard(
      getSortedArticles(articleStats, sortType).slice(0, MAX_LEADERBOARD_SIZE)
    );
  }, [sortType]);

  useEffect(() => {
    let es: EventSource | null = null;
    let isActive = true; // Flag to prevent updates after unmount

    const updateLeaderboard = () => {
      if (!isActive) return;
      setLeaderboard(
        getSortedArticles(articleStats, sortType).slice(0, MAX_LEADERBOARD_SIZE)
      );
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (!data || typeof data !== "object") return;
        if (data.meta?.domain === "canary") return;

        if (data.server_name === "en.wikipedia.org" && data.type === "edit") {
          if (!data.title || data.title.includes(":")) return;

          const now = Date.now();
          const article = articleStats.get(data.title) || {
            count: 0,
            recentEdits: [],
            byteChanges: 0,
            score: 0,
          };

          // Add current edit timestamp and update stats
          article.recentEdits.push(now);
          article.count += 1;
          article.byteChanges +=
            (data.length?.new ?? 0) - (data.length?.old ?? 0);

          articleStats.set(data.title, article);
          updateLeaderboard();
        }
      } catch (err) {
        console.error(
          "Error processing message:",
          err instanceof Error ? err.message : err
        );
      }
    };

    const connectToEventSource = () => {
      try {
        es = new EventSource(
          "https://stream.wikimedia.org/v2/stream/recentchange"
        );

        es.onopen = () => console.log("Connected to the EventStreams feed.");
        es.onmessage = handleMessage;

        es.onerror = (err) => {
          console.error("EventSource error:", err);
          if (es && es.readyState === EventSource.CLOSED) {
            console.log("Connection closed, attempting to reconnect...");
            es.close();
            if (isActive) {
              setTimeout(connectToEventSource, 5000);
            }
          }
        };
      } catch (err) {
        console.error(
          "Error creating EventSource:",
          err instanceof Error ? err.message : err
        );
        if (isActive) {
          setTimeout(connectToEventSource, 5000);
        }
      }
    };

    connectToEventSource();

    return () => {
      isActive = false;
      if (es) {
        console.log("Closing EventSource connection");
        es.close();
      }
    };
  }, [sortType]);

  return (
    <div className="flex flex-col items-center py-10">
      <div className="w-full max-w-xl">
        <div className="flex gap-2 mb-4">
          <button
            className={`${sortType === "bytes" ? "text-gray-500" : ""}`}
            onClick={() => setSortType("bytes")}
          >
            bytes
          </button>{" "}
          |{" "}
          <button
            className={`${sortType === "score" ? "text-gray-500" : ""}`}
            onClick={() => setSortType("score")}
          >
            score
          </button>{" "}
          |{" "}
          <button
            className={`${sortType === "edits" ? "text-gray-500" : ""}`}
            onClick={() => setSortType("edits")}
          >
            edits
          </button>
        </div>
        <div className="space-y-2">
          {leaderboard.map(([title, stats], index) => (
            <div key={title} className="flex justify-between">
              <span className="">
                {index + 1}.{" "}
                <a
                  href={`https://en.wikipedia.org/wiki/${encodeURIComponent(
                    title
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {title}
                </a>
              </span>
              <span>
                {stats.recentEdits.length} | {stats.byteChanges > 0 ? "+" : ""}
                {stats.byteChanges} | {stats.score.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
