import { EventSource } from "eventsource";
import { PrismaClient } from "@prisma/client";
import process from "process";

const prisma = new PrismaClient();
const RETRY_DELAY = 5000; // 5 seconds

async function connectToEventStream(
  url: string,
  attemptCount = 1
): Promise<void> {
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

      console.log(
        `Retrying connection after failure (attempt ${attemptCount + 1})...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      await connectToEventStream(url, attemptCount + 1);
    };
  } catch (error) {
    console.error("Error establishing connection:", error);
    console.log(
      `Retrying connection after error (attempt ${attemptCount + 1})...`
    );
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    await connectToEventStream(url, attemptCount + 1);
  }
}

async function main(): Promise<void> {
  const url = "https://stream.wikimedia.org/v2/stream/recentchange";
  await connectToEventStream(url);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  // Even for fatal errors, we'll retry
  console.log("Restarting after fatal error...");
  setTimeout(() => {
    main().catch(console.error);
  }, RETRY_DELAY);
});
