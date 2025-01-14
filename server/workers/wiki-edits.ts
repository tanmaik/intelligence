import { EventSource } from "eventsource";
import dotenv from "dotenv";

dotenv.config();

const RETRY_DELAY = 5000;
const BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

async function postEdit(data: any) {
  const response = await fetch(`${BASE_URL}/wiki/edits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: data.title,
      title_url: data.title_url,
      comment: data.comment,
      user: data.user,
      bot: data.bot,
      notify_url: data.notify_url,
      minor: data.minor,
      length_old: data.length?.old,
      length_new: data.length?.new,
      server_url: data.server_url,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to post edit: ${response.statusText}`);
  }
  return response.json();
}

async function connectToEventStream(
  url: string,
  attemptCount = 1,
  duration?: number
): Promise<EventSource> {
  try {
    console.log(
      `Connecting to the EventStreams feed (attempt ${attemptCount})...`
    );
    const eventSource = new EventSource(url);

    eventSource.onmessage = async (event: MessageEvent) => {
      let retryCount = 1;
      while (true) {
        try {
          const data: any = JSON.parse(event.data);
          if (
            data.server_name === "en.wikipedia.org" &&
            data.type === "edit" &&
            data.title &&
            !data.title.includes(":")
          ) {
            await postEdit(data);
            console.log(`edit: ${data.title}`);
            break;
          }
          break;
        } catch (error) {
          console.error(
            `Error processing edit (attempt ${retryCount}):`,
            error
          );
          retryCount++;
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
      }
    };

    eventSource.onerror = async (error: Event) => {
      console.error("EventSource failed:", error);
      eventSource.close();

      if (!duration) {
        console.log(
          `Retrying connection after failure (attempt ${attemptCount + 1})...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        await connectToEventStream(url, attemptCount + 1);
      }
    };

    return eventSource;
  } catch (error) {
    console.error("Error establishing connection:", error);
    if (!duration) {
      console.log(
        `Retrying connection after error (attempt ${attemptCount + 1})...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return await connectToEventStream(url, attemptCount + 1);
    }
    throw error;
  }
}

export async function main(duration?: number): Promise<void> {
  const url = "https://stream.wikimedia.org/v2/stream/recentchange";
  const eventSource = await connectToEventStream(url, 1, duration);

  if (duration) {
    await new Promise((resolve) => setTimeout(resolve, duration));
    eventSource.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
