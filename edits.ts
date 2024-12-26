import { EventSource } from "eventsource";

interface WikimediaEdit {
  server_name: string;
  type: string;
  title?: string;
}

async function main(): Promise<void> {
  const url = "https://stream.wikimedia.org/v2/stream/recentchange";

  console.log("Connecting to the EventStreams feed...");

  const eventSource = new EventSource(url);

  eventSource.onmessage = (event: MessageEvent) => {
    try {
      const data: WikimediaEdit = JSON.parse(event.data);
      if (
        data.server_name === "en.wikipedia.org" &&
        data.type === "edit" &&
        !data.title?.includes(":")
      ) {
        console.log("Edit made to", data.title);
      }
    } catch (error) {
      console.log(`Error decoding JSON: ${error}`);
    }
  };

  eventSource.onerror = (error: Event) => {
    console.error("EventSource failed:", error);
    eventSource.close();
  };
}

main().catch(console.error);
