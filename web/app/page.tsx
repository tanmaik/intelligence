"use client";
import { useEffect, useState } from "react";

// Track edits per article with timestamps
const articleEdits = new Map(); // {title: {count: number, recentEdits: timestamp[]}}

// Configuration for spike detection
const WINDOW_MINUTES = 60;
const SPIKE_THRESHOLD = 5; // Number of edits within window to consider it a spike

export default function Home() {
  const [edits, setEdits] = useState<string[]>([]);

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
        const article = articleEdits.get(data.title) || {
          count: 0,
          recentEdits: [],
        };

        // Add current edit timestamp and increment count
        article.recentEdits.push(now);
        article.count += 1;

        // Remove edits outside the time window
        article.recentEdits = article.recentEdits.filter(
          (timestamp: number) => now - timestamp < WINDOW_MINUTES * 60 * 1000
        );

        // Check for spike and prepare message
        let message = "";
        if (article.recentEdits.length >= SPIKE_THRESHOLD) {
          message = `🚨 SPIKE ALERT: ${data.title} has ${article.recentEdits.length} edits in the last ${WINDOW_MINUTES} minutes!`;
        } else {
          message = `${data.title} received edit #${article.count} (${article.recentEdits.length} recent)`;
        }

        articleEdits.set(data.title, article);

        // Add new edit to the log
        setEdits((prev) => [message, ...prev].slice(0, 20)); // Keep last 20 edits
      }
    };

    return () => {
      es.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center py-10">
      <div className="max-w-xl">
        {edits.length > 0 &&
          edits.map((edit, index) => (
            <div key={index} className="text-black">
              {edit}
            </div>
          ))}
      </div>
    </div>
  );
}
