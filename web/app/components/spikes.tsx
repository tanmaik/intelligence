"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

type WikiEditSpike = {
  id: number;
  title: string;
  startTime: string;
  lastEditTime: string;
  totalEdits: number;
  totalBytes: number;
  isActive: boolean;
};

export default function ActiveSpikes() {
  const [spikes, setSpikes] = useState<WikiEditSpike[]>([]);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  async function fetchActiveSpikes() {
    try {
      const res = await fetch(`${baseUrl}/wiki/edits/spikes/active`);
      if (!res.ok) throw new Error("Failed to fetch spikes");
      const data: WikiEditSpike[] = await res.json();
      setSpikes(data);
    } catch (error) {
      console.error("Error fetching active spikes:", error);
    }
  }

  useEffect(() => {
    fetchActiveSpikes();
    const interval = setInterval(fetchActiveSpikes, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-4">
      <h2 className="mb-1 font-medium">subjects</h2>
      {spikes.map((spike) => (
        <div key={spike.id} className="">
          <p className="">
            {spike.title} ({spike.totalBytes} | {spike.totalEdits}),{" "}
            {formatDistanceToNow(new Date(spike.lastEditTime))} ago
          </p>
        </div>
      ))}
    </div>
  );
}
