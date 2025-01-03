import { formatDistanceToNow } from "date-fns";

interface Spike {
  id: number;
  title: string;
  startTime: string;
  lastEditTime: string;
  totalEdits: number;
  totalBytes: number;
  isActive: boolean;
}

async function getRecentSpikes(): Promise<Spike[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  try {
    const res = await fetch(`${apiUrl}/edits/spikes/recent`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      console.error(`Failed to fetch spikes: ${res.status} ${res.statusText}`);
      return [];
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching spikes:", error);
    return [];
  }
}

export default async function Home() {
  const spikes = await getRecentSpikes();

  return (
    <div className="p-2">
      <h1 className="font-semibold">pulse</h1>

      <p className="mt-2 font-medium">recent stories</p>

      <div className="mt-4">
        {spikes.length === 0 ? (
          <p className="text-gray-500">No recent activity spikes found</p>
        ) : (
          <div className="space-y-3">
            {spikes.map((spike) => (
              <div key={`${spike.title}-${spike.startTime}`}>
                <a
                  href={`https://en.wikipedia.org/wiki/${encodeURIComponent(
                    spike.title
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {spike.title}
                </a>
                {spike.isActive && (
                  <span className="ml-2 text-green-600">•</span>
                )}
                <span className="ml-2 text-gray-500">
                  {spike.totalEdits} edits, {spike.totalBytes.toLocaleString()}{" "}
                  bytes
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
