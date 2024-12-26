import { Hono } from "hono";
import { monitor } from "./monitor";

const app = new Hono();
app.get("/", (c) => c.text("Hello Bun!"));

// SSE endpoint for real-time updates
app.get("/monitor/stream", (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        const metrics = monitor.getMetrics("./prisma/dev.db");
        controller.enqueue(
          `event: update\ndata: ${JSON.stringify(metrics)}\n\n`
        );
      }, 1000);

      c.req.raw.signal.addEventListener("abort", () => {
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// Regular endpoint for single reading
app.get("/monitor", (c) => {
  const metrics = monitor.getMetrics("./prisma/dev.db");
  return c.json(metrics);
});

app.notFound((c) => {
  return c.text("huh", 404);
});

export default {
  port: 3000,
  fetch: app.fetch,
};
