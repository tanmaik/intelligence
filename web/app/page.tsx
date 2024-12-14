"use client";
import { useEffect, useState } from "react";

interface ArticleStats {
  count: number;
  recentEdits: number[];
  byteChanges: number;
  score: number;
}

const articleStats = new Map<string, ArticleStats>();

const WINDOW_MINUTES = 60;
const MAX_LEADERBOARD_SIZE = 10;

// Scoring weights
const EDIT_COUNT_WEIGHT = 0.6; // 60% weight to edit frequency
const BYTE_CHANGE_WEIGHT = 0.4; // 40% weight to cumulative byte changes

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<[string, ArticleStats][]>([]);

  const calculateScore = (stats: ArticleStats) => {
    const normalizedEdits = stats.recentEdits.length;
    const normalizedBytes = Math.abs(stats.byteChanges) / 1000; // Normalize byte changes to thousands
    return (
      normalizedEdits * EDIT_COUNT_WEIGHT + normalizedBytes * BYTE_CHANGE_WEIGHT
    );
  };

  const updateLeaderboard = () => {
    const sortedArticles = Array.from(articleStats.entries())
      .map(([title, stats]) => {
        stats.score = calculateScore(stats);
        return [title, stats] as [string, ArticleStats];
      })
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, MAX_LEADERBOARD_SIZE);

    setLeaderboard(sortedArticles);
  };

  useEffect(() => {
    const es = new EventSource(
      "https://stream.wikimedia.org/v2/stream/recentchange"
    );

    es.onopen = () => {
      console.log("Connected to the EventStreams feed.");
    };

    es.onerror = (err) => {
      console.error("Error occurred:", err);
    };

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.meta?.domain === "canary") return;

      if (data.server_name === "en.wikipedia.org" && data.type === "edit") {
        if (data.title.includes(":")) return;

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
          (data.length?.new || 0) - (data.length?.old || 0);

        // Remove edits outside the time window
        article.recentEdits = article.recentEdits.filter(
          (timestamp: number) => now - timestamp < WINDOW_MINUTES * 60 * 1000
        );

        articleStats.set(data.title, article);
        updateLeaderboard();
      }
    };

    return () => {
      es.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center py-10">
      <div className="w-full max-w-xl">
        <div className="space-y-2">
          {leaderboard.map(([title, stats], index) => (
            <div key={title} className="">
              <div className="flex justify-between items-center">
                <span className="font-bold">
                  {index + 1}. {title} ({stats.recentEdits.length} edits)
                </span>
                <span className="text-sm text-gray-600">
                  Score: {stats.score.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Recent edits: {stats.recentEdits.length} | Byte changes:{" "}
                {stats.byteChanges > 0 ? "+" : ""}
                {stats.byteChanges}
              </div>
            </div>
          ))}{" "}
          <p className="text-sm">
            Score = (Recent Edits × {EDIT_COUNT_WEIGHT}) + (|Byte Changes| ÷
            1000 × {BYTE_CHANGE_WEIGHT})
          </p>
        </div>
      </div>
    </div>
  );
}
