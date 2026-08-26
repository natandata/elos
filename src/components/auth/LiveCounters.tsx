"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LiveCounters() {
  const [total, setTotal] = useState<number | null>(null);
  const [online, setOnline] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase
      .rpc("public_stats")
      .single<{ total_users: number }>()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setFailed(true);
        else setTotal(Number(data.total_users));
      });

    const channel = supabase.channel("online-users", {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        if (!cancelled) setOnline(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ at: Date.now() });
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (failed) return null;

  return (
    <div className="flex items-center justify-center gap-5 text-sm text-[var(--muted)]">
      <span className="flex items-center gap-2">
        <span className="live-dot inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
        <strong className="font-semibold text-[var(--ink)] tabular-nums">
          {total ?? "—"}
        </strong>{" "}
        participantes
      </span>
      <span className="flex items-center gap-2">
        <span className="live-dot inline-block h-2 w-2 rounded-full bg-emerald-500" />
        <strong className="font-semibold text-[var(--ink)] tabular-nums">
          {online ?? "—"}
        </strong>{" "}
        online agora
      </span>
    </div>
  );
}
