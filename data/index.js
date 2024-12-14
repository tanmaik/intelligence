import { EventSource } from "eventsource";

const url = "https://stream.wikimedia.org/v2/stream/recentchange";
const es = new EventSource(url);
import { simpletext } from "./lib/simpletext.js";

// Track edits per article with timestamps
const articleEdits = new Map(); // {title: {count: number, recentEdits: timestamp[]}}

const sendMessage = async (params) => {
  try {
    const response = await simpletext.sendSMS(params);
    console.log(response);
  } catch (error) {
    console.error(error);
  }
};

// Configuration for spike detection
const WINDOW_MINUTES = 60;
const SPIKE_THRESHOLD = 5; // Number of edits within window to consider it a spike

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
      (timestamp) => now - timestamp < WINDOW_MINUTES * 60 * 1000
    );

    // Check for spike
    if (article.recentEdits.length >= SPIKE_THRESHOLD) {
      console.log(
        `🚨 SPIKE ALERT: ${data.title} has ${article.recentEdits.length} edits in the last ${WINDOW_MINUTES} minutes!`
      );
      sendMessage({
        to: "+17032971353",
        message: `🚨 Wikipedia Spike Alert: "${data.title}" has ${article.recentEdits.length} edits in the last ${WINDOW_MINUTES} minutes!`,
      });
    }

    articleEdits.set(data.title, article);
    console.log(
      `${data.title} received edit #${article.count} (${article.recentEdits.length} recent)`
    );
  }
};
