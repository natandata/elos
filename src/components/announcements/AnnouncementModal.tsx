"use client";

import { useState, useTransition } from "react";
import { dismissAnnouncement } from "@/lib/actions/announcements";

export type ActiveAnnouncement = { id: string; title: string; body: string; version: number };

/** Card de aviso do admin, mostrado uma vez por versão a cada usuário. */
export function AnnouncementModal({ announcement }: { announcement: ActiveAnnouncement }) {
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  if (hidden) return null;

  function close() {
    setHidden(true);
    startTransition(() => {
      void dismissAnnouncement(announcement.id, announcement.version);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
    >
      <div className="card max-h-[90vh] w-full max-w-sm space-y-3 overflow-y-auto p-5">
        <span className="chip bg-[var(--accent-soft)] text-[var(--accent-strong)]">📣 Novidade</span>
        <p id="announcement-title" className="text-lg font-extrabold">
          {announcement.title}
        </p>
        <p className="whitespace-pre-line text-sm">{announcement.body}</p>
        <button type="button" className="btn btn-primary w-full !py-2" onClick={close} disabled={pending}>
          Entendi
        </button>
      </div>
    </div>
  );
}
