"use client";

import type { ReactNode } from "react";
import { logContentClick } from "@/lib/actions/contentClick";

export function VideoLink({ videoId, children }: { videoId: string; children: ReactNode }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => void logContentClick(videoId).catch(() => null)}
      className="group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg)] transition active:scale-[0.99]"
    >
      {children}
    </a>
  );
}
