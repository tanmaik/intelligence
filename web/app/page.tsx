"use client";

import { useEffect, useState } from "react";

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

function SpikesList() {
  const [spikes, setSpikes] = useState<Spike[]>([]);

  useEffect(() => {
    const fetchSpikes = async () => {
      const newSpikes = await getRecentSpikes();
      setSpikes(newSpikes);
    };

    // Initial fetch
    fetchSpikes();

    // Set up polling every second
    const interval = setInterval(fetchSpikes, 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  const activeSpikes = spikes.filter((spike) => spike.isActive);
  const inactiveSpikes = spikes.filter((spike) => !spike.isActive);

  const SpikeItem = ({ spike }: { spike: Spike }) => (
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
      <span className="ml-2 text-gray-500">
        {spike.totalEdits} edits, {spike.totalBytes.toLocaleString()} bytes
      </span>
    </div>
  );

  return (
    <div className="mt-4 space-y-6">
      <div>
        <p className="font-medium">recent stories</p>
        <div className="mt-2">
          {activeSpikes.length === 0 ? (
            <p className="text-gray-500">No active spikes found</p>
          ) : (
            <div className="space-y-1">
              {activeSpikes.map((spike) => (
                <SpikeItem
                  key={`${spike.title}-${spike.startTime}`}
                  spike={spike}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {inactiveSpikes.length > 0 && (
        <div>
          <p className="font-medium">old news</p>
          <div className="mt-2">
            <div className="space-y-1">
              {inactiveSpikes.map((spike) => (
                <SpikeItem
                  key={`${spike.title}-${spike.startTime}`}
                  spike={spike}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="p-2">
      <h1 className="font-bold">pulse</h1>
      <SpikesList />
    </div>
  );
}
