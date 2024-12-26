import { EventSource } from "eventsource";
import { PrismaClient } from "@prisma/client";
import process from "process";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const url = "https://stream.wikimedia.org/v2/stream/recentchange";
  console.log("Connecting to the EventStreams feed...");

  const eventSource = new EventSource(url);

  eventSource.onmessage = async (event: MessageEvent) => {
    try {
      const data: any = JSON.parse(event.data);
      if (
        data.server_name === "en.wikipedia.org" &&
        data.type === "edit" &&
        data.title &&
        !data.title.includes(":")
      ) {
        // Save the edit to the database
        await prisma.mediaWikiRecentChange.create({
          data: {
            title: data.title,
            titleUrl: data.title_url,
            comment: data.comment,
            user: data.user,
            bot: data.bot,
            notifyUrl: data.notify_url,
            minor: data.minor,
            lengthOld: data.length?.old,
            lengthNew: data.length?.new,
            serverUrl: data.server_url,
          },
        });
        console.log(`Saved edit for article: ${data.title}`);
      }
    } catch (error) {
      console.error("Error processing edit:", error);
    }
  };

  eventSource.onerror = (error: Event) => {
    console.error("EventSource failed:", error);
    eventSource.close();
  };
}

main().catch(console.error);
