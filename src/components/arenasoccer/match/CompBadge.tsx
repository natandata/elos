"use client";

import { useState } from "react";

/** Logo da liga (arquivo em /public) ou o troféu das Copas, com o texto ao lado. */
export function CompBadge({ kind, id, label, size = 18 }: { kind: "league" | "cup"; id: string; label: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = kind === "league" ? `/arenasoccer/crests/league/${id}.png` : "/arenasoccer/crests/cup/trophy.svg";
  return (
    <span className="inline-flex items-center gap-1.5">
      {failed ? (
        <span aria-hidden>{kind === "cup" ? "🏆" : "⚽"}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- logos pequenos, servidos de /public
        <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`shrink-0 object-contain ${kind === "league" ? "rounded-md bg-white p-[2px]" : ""}`} style={{ width: size, height: size }} />
      )}
      {label}
    </span>
  );
}
