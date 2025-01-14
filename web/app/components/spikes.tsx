"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

type WikiEdit = {
  id: number;
  title: string;
  notifyUrl: string;
  timestamp: string;
};

type WikiEditSpike = {
  id: number;
  title: string;
  startTime: string;
  lastEditTime: string;
  totalEdits: number;
  totalBytes: number;
  isActive: boolean;
  startEdit?: WikiEdit;
  endEdit?: WikiEdit;
};

export default function ActiveSpikes() {
  const [spikes, setSpikes] = useState<WikiEditSpike[]>([]);
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  async function fetchClosestEdits(spike: WikiEditSpike) {
    try {
      const res = await fetch(`${baseUrl}/wiki/edits/closest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: spike.title,
          startTime: spike.startTime,
          endTime: spike.lastEditTime,
        }),
      });
      if (!res.ok) throw new Error("Failed to fetch closest edits");
      const { startEdit, endEdit } = await res.json();
      return { ...spike, startEdit, endEdit };
    } catch (error) {
      console.error("Error fetching closest edits:", error);
      return spike;
    }
  }

  async function fetchActiveSpikes() {
    try {
      const res = await fetch(`${baseUrl}/wiki/edits/spikes/active`);
      if (!res.ok) throw new Error("Failed to fetch spikes");
      const data: WikiEditSpike[] = await res.json();

      const spikesWithEdits = await Promise.all(data.map(fetchClosestEdits));
      setSpikes(spikesWithEdits);
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
            {spike.title} ({spike.totalBytes} | {spike.totalEdits}), last edit{" "}
            {formatDistanceToNow(new Date(spike.lastEditTime))} | started{" "}
            {formatDistanceToNow(new Date(spike.startTime))}
            {spike.startEdit && (
              <>
                {" "}
                |{" "}
                <a
                  href={spike.startEdit.notifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  first edit
                </a>
              </>
            )}
            {spike.endEdit && (
              <>
                {" "}
                |{" "}
                <a
                  href={spike.endEdit.notifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  latest edit
                </a>
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
