"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { removeDailyPraise, setDailyPraise } from "@/lib/actions/praise";

export type PraiseItem = { userId: string; name: string; avatar: string | null; videoId: string; url: string; title: string; channel: string; at: string };

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h`;
};

/** "Louvor do dia": cada pessoa coloca o link de um louvor do YouTube (como as notas do Instagram); dura 24 horas. */
export function DailyPraise({ items, meId, isAdmin }: { items: PraiseItem[]; meId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const mine = items.find((i) => i.userId === meId);
  const others = items.filter((i) => i.userId !== meId);

  function save() {
    setError(null);
    start(async () => {
      const r = await setDailyPraise(link);
      if (r.error) return setError(r.error);
      setLink("");
      setOpen(false);
      router.refresh();
    });
  }
  function remove(userId?: string) {
    start(async () => {
      await removeDailyPraise(userId);
      router.refresh();
    });
  }

  return (
    <section className="card mb-5 p-3" aria-label="Louvor do dia">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black">🎵 Louvor do dia</p>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-black text-[var(--accent-strong)]">
          {mine ? "Trocar o meu" : "+ Colocar o meu"}
        </button>
      </div>
      <p className="mt-0.5 text-[11px] text-[var(--muted)]">O louvor que você está pensando agora. Cole o link do YouTube; ele fica 24 horas.</p>

      {open ? (
        <div className="mt-2 space-y-2">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm" aria-label="Link do louvor no YouTube" />
          {error ? <p className="text-xs font-bold text-rose-600">{error}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={save} disabled={pending || link.trim().length < 5} className="btn btn-primary !py-2 !text-sm disabled:opacity-50">
              {pending ? "Salvando…" : "Publicar"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost !py-2 !text-sm">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {[...(mine ? [mine] : []), ...others].map((p) => (
          <li key={p.userId} className="w-44 shrink-0 rounded-2xl bg-[var(--line)] p-2">
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
              <span className="flex items-center gap-1.5">
                <Avatar url={p.avatar} name={p.name} size={26} />
                <span className="min-w-0 flex-1 truncate text-xs font-black">{p.userId === meId ? "Você" : p.name.split(" ")[0]}</span>
                <span className="text-[10px] text-[var(--muted)]">{ago(p.at)}</span>
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${p.videoId}/mqdefault.jpg`} alt="" className="mt-1.5 aspect-video w-full rounded-lg object-cover" loading="lazy" draggable={false} />
              <span className="mt-1 block line-clamp-2 text-[11px] font-bold leading-snug">▶ {p.title}</span>
              <span className="block truncate text-[10px] text-[var(--muted)]">{p.channel}</span>
            </a>
            {p.userId === meId || isAdmin ? (
              <button type="button" onClick={() => remove(p.userId === meId ? undefined : p.userId)} disabled={pending} className="mt-1 text-[10px] font-bold text-rose-600 underline">
                {p.userId === meId ? "Remover o meu" : "Remover (admin)"}
              </button>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? <li className="py-2 text-xs text-[var(--muted)]">Ninguém colocou um louvor ainda hoje. Seja o primeiro!</li> : null}
      </ul>
    </section>
  );
}
