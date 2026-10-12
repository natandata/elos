"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { relativeTimeShort } from "@/lib/relativeTime";

export type ActivityActor = { id: string; name: string; avatar: string | null };

export type ActivityGroup = {
  key: string;
  kind: "like" | "comment" | "story_view";
  actors: ActivityActor[];
  /** Quantas pessoas no total (pode ser maior que `actors`, que guarda só as primeiras). */
  total: number;
  /** Comentário (só quando kind = "comment"). */
  body: string | null;
  /** Emoji da reação quando só uma pessoa reagiu. */
  emoji: string | null;
  at: string;
  thumb: string | null;
  href: string;
};

const FILTERS = [
  { id: "all", label: "Tudo" },
  { id: "comment", label: "Comentários" },
  { id: "like", label: "Reações" },
  { id: "story_view", label: "Stories" },
] as const;

function sectionOf(iso: string): string {
  const age = Date.now() - new Date(iso).getTime();
  if (age < 86_400_000) return "Hoje";
  if (age < 7 * 86_400_000) return "Esta semana";
  if (age < 30 * 86_400_000) return "Este mês";
  return "Anteriores";
}

function Names({ g }: { g: ActivityGroup }) {
  const first = g.actors[0];
  const second = g.actors[1];
  const bold = (name: string, id: string) => (
    <Link href={`/app/elogram/perfil/${id}`} className="font-semibold">
      {name}
    </Link>
  );
  if (g.total <= 1 || !second) return bold(first.name, first.id);
  if (g.total === 2) {
    return (
      <>
        {bold(first.name, first.id)} e {bold(second.name, second.id)}
      </>
    );
  }
  return (
    <>
      {bold(first.name, first.id)}, {bold(second.name, second.id)} e outras {g.total - 2}{" "}
      {g.total - 2 === 1 ? "pessoa" : "pessoas"}
    </>
  );
}

function sentence(g: ActivityGroup) {
  const many = g.total > 1;
  if (g.kind === "comment") return `comentou: ${g.body ?? ""}`;
  if (g.kind === "story_view") return many ? "viram o seu story." : "viu o seu story.";
  return many ? "reagiram à sua foto." : `reagiu ${g.emoji ?? "❤️"} à sua foto.`;
}

/** Atividade no estilo da aba de notificações do Instagram: filtros, seções por data e fotos agrupadas. */
export function ElogramActivityList({ groups }: { groups: ActivityGroup[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const shown = groups.filter((g) => filter === "all" || g.kind === filter);

  const sections: { title: string; items: ActivityGroup[] }[] = [];
  for (const g of shown) {
    const title = sectionOf(g.at);
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.items.push(g);
    else sections.push({ title, items: [g] });
  }

  return (
    <div>
      <div className="mb-1 flex gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-[15px] font-semibold ${
              filter === f.id ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--card)] ring-1 ring-[var(--line)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-[var(--muted)]">
          {groups.length === 0
            ? "Quando alguém reagir, comentar ou ver seu story, aparece aqui."
            : "Nada nessa categoria."}
        </p>
      ) : (
        sections.map((s) => (
          <section key={s.title} className="px-3 pt-3">
            <h2 className="mb-1 text-[17px] font-bold">{s.title}</h2>
            <ul>
              {s.items.map((g) => (
                <li key={g.key} className="flex items-center gap-3 py-2.5">
                  <Link href={g.href} className="relative h-[54px] w-[54px] shrink-0" aria-label="Abrir">
                    {g.actors.length > 1 ? (
                      <>
                        <span className="absolute left-0 top-0 rounded-full ring-2 ring-[var(--bg)]">
                          <Avatar url={g.actors[1].avatar} name={g.actors[1].name} size={36} />
                        </span>
                        <span className="absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--bg)]">
                          <Avatar url={g.actors[0].avatar} name={g.actors[0].name} size={38} />
                        </span>
                      </>
                    ) : (
                      <Avatar url={g.actors[0].avatar} name={g.actors[0].name} size={54} />
                    )}
                  </Link>

                  <p className="min-w-0 flex-1 text-[15px] leading-snug">
                    <Names g={g} /> {sentence(g)}{" "}
                    <span className="text-[var(--muted)]" suppressHydrationWarning>
                      {relativeTimeShort(g.at)}
                    </span>
                  </p>

                  {g.thumb ? (
                    <Link href={g.href} className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.thumb} alt="" className="h-[54px] w-[54px] rounded-lg object-cover" />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
