import { EventSource } from "eventsource";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const RETRY_DELAY = 5000;

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
