"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { GAME_CATALOG } from "@/lib/games/catalog";
import { formatDateTime } from "@/lib/types";

export type ActivityRow = {
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  detail: string;
  created_at: string;
};

type ActivityType = { key: string; label: string; icon: string; group: "Geral" | "Jogos" };

const LABEL: Record<string, { icon: string; verb: string }> = {
  status: { icon: "💛", verb: "respondeu o status do dia" },
  mission_submitted: { icon: "🎯", verb: "enviou uma missão pra avaliação" },
  mission_approved: { icon: "✅", verb: "teve uma missão aprovada" },
  mission_rejected: { icon: "❌", verb: "teve uma missão recusada" },
  feed_post: { icon: "📸", verb: "postou no Elogram" },
  story_post: { icon: "⚡", verb: "postou um Story" },
  devotional_entry: { icon: "📖", verb: "escreveu no devocional" },
  prayer_request: { icon: "🙏", verb: "criou um pedido de oração" },
  game_play: { icon: "🎮", verb: "jogou" },
  game_chest: { icon: "🎁", verb: "abriu o baú dos Jogos" },
  game_duel: { icon: "⚔️", verb: "terminou um duelo" },
  arena_match: { icon: "🏰", verb: "jogou na Arena dos Heróis" },
  arena_pvp: { icon: "🛡️", verb: "jogou um 1x1 na Arena" },
  arena_duo: { icon: "👥", verb: "jogou em duplas na Arena" },
  bible_reading: { icon: "📖", verb: "está lendo a Bíblia" },
  bible_reading_done: { icon: "✅", verb: "completou a leitura do dia" },
};

/** Ícone e verbo de cada atividade. "game:<chave>" vale para qualquer jogo do catálogo (inclusive os futuros). */
function activityMeta(action: string): { icon: string; verb: string } {
  if (LABEL[action]) return LABEL[action];
  if (action === "game:spotcria") return { icon: "🎧", verb: "no Spot Cria" };
  if (action === "game:conteudo") return { icon: "▶️", verb: "abriu um vídeo em Conteúdo relevante" };
  if (action === "game:store") return { icon: "🛍️", verb: "comprou na Loja de Jogos" };
  if (action.startsWith("game:")) {
    const g = GAME_CATALOG.find((x) => x.key === action.slice(5));
    return { icon: g?.emoji ?? "🎮", verb: g ? `jogou ${g.title.replace(/ \(.*\)$/, "")}` : "jogou" };
  }
  return { icon: "•", verb: action };
}

/** Os tipos que o admin pode ligar/desligar. Vários códigos de ação viram um tipo só (ex.: as 3 situações de missão). */
const GENERAL: ActivityType[] = [
  { key: "bible", label: "Leitura da Bíblia", icon: "📖", group: "Geral" },
  { key: "status", label: "Status do dia", icon: "💛", group: "Geral" },
  { key: "mission", label: "Missões", icon: "🎯", group: "Geral" },
  { key: "elogram", label: "Elogram e Stories", icon: "📸", group: "Geral" },
  { key: "devotional", label: "Devocional", icon: "📖", group: "Geral" },
  { key: "prayer", label: "Pedidos de oração", icon: "🙏", group: "Geral" },
  { key: "spotcria", label: "Spot Cria", icon: "🎧", group: "Geral" },
  { key: "conteudo", label: "Conteúdo relevante", icon: "▶️", group: "Geral" },
  { key: "store", label: "Loja de Jogos", icon: "🛍️", group: "Geral" },
];
const GAMES: ActivityType[] = [
  { key: "game_misc", label: "Jogos (baú, duelos e outros)", icon: "🎮", group: "Jogos" },
  { key: "arena", label: "Arena dos Heróis", icon: "🏰", group: "Jogos" },
  ...GAME_CATALOG.filter((g) => g.key !== "arena").map((g) => ({ key: `game:${g.key}`, label: g.title.replace(/ \(.*\)$/, ""), icon: g.emoji, group: "Jogos" as const })),
];
const TYPES = [...GENERAL, ...GAMES];

function typeOf(action: string): string {
  if (action.startsWith("bible_reading")) return "bible";
  if (action === "status") return "status";
  if (action.startsWith("mission_")) return "mission";
  if (action === "feed_post" || action === "story_post") return "elogram";
  if (action === "devotional_entry") return "devotional";
  if (action === "prayer_request") return "prayer";
  if (action === "game:spotcria") return "spotcria";
  if (action === "game:conteudo") return "conteudo";
  if (action === "game:store") return "store";
  if (action.startsWith("arena_") || action === "game:arena" || action === "game:arenacampanha") return "arena";
  if (action.startsWith("game:")) return TYPES.some((t) => t.key === action) ? action : "game_misc";
  if (action.startsWith("game_")) return "game_misc";
  return "game_misc";
}

const STORAGE = "elos_admin_activity_hidden_v1";

/** "Atividade recente" do admin, com filtro por tipo (guardado neste aparelho). */
export function RecentActivity({ rows }: { rows: ActivityRow[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setHidden(JSON.parse(raw) as string[]);
    } catch {
      // sem armazenamento: começa mostrando tudo
    }
  }, []);

  const save = (next: string[]) => {
    setHidden(next);
    try {
      window.localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      // ignora
    }
  };
  const toggle = (key: string) => save(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(typeOf(r.action), (m.get(typeOf(r.action)) ?? 0) + 1));
    return m;
  }, [rows]);
  const shown = rows.filter((r) => !hidden.includes(typeOf(r.action)));

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Atividade recente (últimas 24h)</h2>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-bold text-[var(--accent-strong)]" aria-expanded={open}>
          ⚙️ Filtrar{hidden.length > 0 ? ` (${TYPES.length - hidden.length}/${TYPES.length})` : ""}
        </button>
      </div>

      {open ? (
        <Card className="mb-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--muted)]">Escolha os tipos que aparecem na lista.</p>
            <div className="flex gap-2 text-xs font-bold">
              <button type="button" onClick={() => save([])} className="text-[var(--accent-strong)]">
                Todos
              </button>
              <button type="button" onClick={() => save(TYPES.map((t) => t.key))} className="text-[var(--muted)]">
                Nenhum
              </button>
            </div>
          </div>
          {(["Geral", "Jogos"] as const).map((g) => (
            <div key={g} className="mb-2">
              <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{g}</p>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.filter((t) => t.group === g).map((t) => {
                  const on = !hidden.includes(t.key);
                  const n = counts.get(t.key) ?? 0;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => toggle(t.key)}
                      aria-pressed={on}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${on ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "border-[var(--line)] text-[var(--muted)] line-through opacity-70"}`}
                    >
                      <span aria-hidden>{t.icon} </span>
                      {t.label}
                      {n > 0 ? <span className="ml-1 opacity-70">· {n}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      <Card className="!p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)]">Nenhuma atividade registrada ainda.</p>
        ) : shown.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)]">Todos os tipos estão escondidos pelo filtro ({rows.length} atividade(s) ocultas).</p>
        ) : (
          <ul className="max-h-96 divide-y divide-[var(--line)] overflow-y-auto">
            {shown.map((a, i) => {
              const meta = activityMeta(a.action);
              return (
                <li key={i} className="flex items-start gap-3 p-3">
                  <span className="text-lg leading-none" aria-hidden>
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <strong>{a.actor_name || "Alguém"}</strong> {meta.verb}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">{a.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--muted)]">{formatDateTime(a.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {hidden.length > 0 && rows.length > 0 ? <p className="border-t border-[var(--line)] px-3 py-2 text-[11px] text-[var(--muted)]">Mostrando {shown.length} de {rows.length} atividade(s).</p> : null}
      </Card>
    </section>
  );
}
