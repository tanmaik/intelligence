import { EventSource } from "eventsource";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const RETRY_DELAY = 5000;
async function connectToEventStream(url, attemptCount = 1) {
    try {
        console.log(`Connecting to the EventStreams feed (attempt ${attemptCount})...`);
        const eventSource = new EventSource(url);
        eventSource.onmessage = async (event) => {
            let retryCount = 1;
            while (true) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.server_name === "en.wikipedia.org" &&
                        data.type === "edit" &&
                        data.title &&
                        !data.title.includes(":")) {
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
                }
                catch (error) {
                    console.error(`Error processing edit (attempt ${retryCount}):`, error);
                    retryCount++;
                    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
                }
            }
        };
        eventSource.onerror = async (error) => {
            console.error("EventSource failed:", error);
            eventSource.close();
            console.log(`Retrying connection after failure (attempt ${attemptCount + 1})...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            await connectToEventStream(url, attemptCount + 1);
        };
    }
    catch (error) {
        console.error("Error establishing connection:", error);
        console.log(`Retrying connection after error (attempt ${attemptCount + 1})...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        await connectToEventStream(url, attemptCount + 1);
    }
}
export async function main() {
    const url = "https://stream.wikimedia.org/v2/stream/recentchange";
    await connectToEventStream(url);
}
