import Link from "next/link";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatXp, type Profile } from "@/lib/types";

type Day = { day: string; xp: number };
type History = {
  since: string | null;
  total: number;
  missions_done: number;
  missions_xp: number;
  active_members: number;
  by_day: Day[];
  by_type: { type: string; xp: number; n: number }[];
  members: { id: string; name: string; xp: number; missions: number }[];
  bonus_in_period: number;
  bonus_events: { at: string; amount: number; source: string }[];
  bonus_total_now: number;
  bonus_logged_total: number;
};
type MissionRow = {
  done_at: string;
  mission_id: string | null;
  mission_title: string;
  member_id: string;
  member_name: string;
  xp: number;
  approver_name: string | null;
};

const PERIODS: { key: string; label: string; days: number | null }[] = [
  { key: "7", label: "7 dias", days: 7 },
  { key: "30", label: "30 dias", days: 30 },
  { key: "90", label: "90 dias", days: 90 },
  { key: "tudo", label: "Tudo", days: null },
];

const TYPE_LABEL: Record<string, string> = {
  mission_approved: "Missões cumpridas",
  daily_login: "Entrada diária",
  feed_theme: "Tema do feed",
  elo_challenge: "Desafio de Elo",
  game_arena: "Arena dos Heróis",
  game_arena_pvp: "Arena: desafio 1x1",
  game_arena_duo: "Arena: duplas",
  game_who: "Jogo: Quem Sou Eu",
  game_verse: "Jogo: Versículo",
  game_quiz: "Jogo: Quiz",
  game_order: "Jogo: Ordem",
  game_duel: "Jogo: Duelo",
  game_dress: "Vista o Herói",
};
const typeLabel = (t: string): string => TYPE_LABEL[t] ?? (t.startsWith("game_") ? "Outros jogos" : t.replace(/_/g, " "));

/** Hoje no horário de Brasília (AAAA-MM-DD). */
function todayBrt(): string {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}
const addDays = (iso: string, n: number): string => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

/** Uma barra por dia (com os dias sem XP em zero); em períodos longos, uma por semana. */
function buildSeries(byDay: Day[], days: number | null): { label: string; xp: number }[] {
  const map = new Map(byDay.map((d) => [d.day, Number(d.xp)]));
  const today = todayBrt();
  const first = days !== null ? addDays(today, -(days - 1)) : (byDay[0]?.day ?? today);
  const out: { label: string; xp: number }[] = [];
  const span = Math.round((Date.parse(today) - Date.parse(first)) / 86400000) + 1;
  const step = span > 100 ? 7 : 1;
  for (let i = 0; i < span; i += step) {
    let xp = 0;
    for (let k = 0; k < step && i + k < span; k++) xp += map.get(addDays(first, i + k)) ?? 0;
    const start = addDays(first, i);
    out.push({ label: step === 1 ? formatDate(start) : `semana de ${formatDate(start)}`, xp });
  }
  return out;
}

/** Histórico de XP ganho pelos crias de um Elo e das missões cumpridas. Admin escolhe o Elo; líder vê o próprio. */
export async function EloHistory({
  profile,
  basePath,
  eloParam,
  periodParam,
}: {
  profile: Profile;
  basePath: string;
  eloParam?: string;
  periodParam?: string;
}) {
  const supabase = await createClient();
  const isAdmin = profile.role === "admin";

  const { data: eloRows } = isAdmin
    ? await supabase.from("elos").select("id, name").order("gender").order("age_range")
    : await supabase.from("elos").select("id, name").eq("id", profile.elo_id ?? "");
  const elos = (eloRows ?? []) as { id: string; name: string }[];
  const elo = elos.find((e) => e.id === eloParam) ?? elos[0];

  const period = PERIODS.find((p) => p.key === periodParam) ?? PERIODS[1];
  const href = (e: string, p: string) => `${basePath}?elo=${e}&periodo=${p}`;

  if (!elo) {
    return (
      <>
        <PageHeader title="Histórico de XP" />
        <EmptyState>Você ainda não está em um Elo.</EmptyState>
      </>
    );
  }

  const [histRes, missionsRes] = await Promise.all([
    supabase.rpc("elo_xp_history", { p_elo: elo.id, p_days: period.days }),
    supabase.rpc("elo_missions_done", { p_elo: elo.id, p_days: period.days, p_limit: 200 }),
  ]);
  const h = histRes.data as History | null;
  const missions = (missionsRes.data ?? []) as MissionRow[];

  const series = h ? buildSeries(h.by_day, period.days) : [];
  const maxBar = Math.max(1, ...series.map((s) => s.xp));
  const maxType = Math.max(1, ...(h?.by_type ?? []).map((t) => Math.abs(Number(t.xp))));
  const bonusBefore = h ? h.bonus_total_now - h.bonus_logged_total : 0;

  return (
    <>
      <PageHeader
        title="Histórico de XP"
        subtitle={`${elo.name}: o XP que os crias ganharam e as missões que cumpriram.`}
      />

      {isAdmin && elos.length > 1 ? (
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {elos.map((e) => (
            <Link
              key={e.id}
              href={href(e.id, period.key)}
              className={`chip shrink-0 ${e.id === elo.id ? "bg-[var(--accent)] text-white" : ""}`}
            >
              {e.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={href(elo.id, p.key)}
            className={`chip ${p.key === period.key ? "bg-[var(--accent)] text-white" : ""}`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {!h ? (
        <EmptyState>Não foi possível carregar o histórico agora. Tente de novo em instantes.</EmptyState>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="XP dos crias" value={formatXp(Number(h.total))} hint={period.days ? `nos últimos ${period.days} dias` : "desde o começo"} />
            <StatCard label="Missões cumpridas" value={Number(h.missions_done)} hint={`${formatXp(Number(h.missions_xp))} XP em missões`} />
            <StatCard label="Crias com XP" value={Number(h.active_members)} hint="ganharam XP no período" />
            <StatCard label="Bônus do Elo" value={formatXp(Number(h.bonus_in_period))} hint="dado pela administração" />
          </div>

          <Card className="mb-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">XP ganho por dia</h2>
            {series.length === 0 || series.every((s) => s.xp === 0) ? (
              <EmptyState>Nenhum XP registrado neste período.</EmptyState>
            ) : (
              <>
                <div className="flex h-36 items-end gap-px" role="img" aria-label="Gráfico de XP ganho por dia">
                  {series.map((s, i) => (
                    <div
                      key={i}
                      title={`${s.label}: ${s.xp} XP`}
                      className="min-w-px flex-1 rounded-t bg-[var(--accent)]"
                      style={{ height: `${Math.max(s.xp > 0 ? 3 : 0, (s.xp / maxBar) * 100)}%`, opacity: s.xp > 0 ? 1 : 0.15 }}
                    />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-[var(--muted)]">
                  <span>{series[0]?.label}</span>
                  <span>maior dia: {formatXp(maxBar)} XP</span>
                  <span>{series[series.length - 1]?.label}</span>
                </div>
              </>
            )}
          </Card>

          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">De onde veio o XP</h2>
              {h.by_type.length === 0 ? (
                <EmptyState>Sem XP neste período.</EmptyState>
              ) : (
                <ul className="space-y-2">
                  {h.by_type.map((t) => (
                    <li key={t.type}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-semibold">{typeLabel(t.type)}</span>
                        <span className="shrink-0 tabular-nums">
                          {formatXp(Number(t.xp))} XP <span className="text-xs text-[var(--muted)]">· {t.n}x</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(2, (Math.abs(Number(t.xp)) / maxType) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Quem mais ganhou</h2>
              {h.members.length === 0 ? (
                <EmptyState>Ninguém ganhou XP neste período.</EmptyState>
              ) : (
                <ol className="space-y-1.5">
                  {h.members.slice(0, 15).map((m, i) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="mr-2 inline-block w-5 text-right text-xs text-[var(--muted)]">{i + 1}</span>
                        {m.name}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatXp(Number(m.xp))} XP
                        {m.missions > 0 ? <span className="text-xs text-[var(--muted)]"> · {m.missions} missões</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <section className="mb-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Missões cumpridas ({missions.length}
              {missions.length >= 200 ? "+" : ""})
            </h2>
            {missions.length === 0 ? (
              <EmptyState>Nenhuma missão cumprida neste período.</EmptyState>
            ) : (
              <div className="space-y-2">
                {missions.map((m, i) => (
                  <Card key={`${m.member_id}-${m.done_at}-${i}`} className="!p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">{m.mission_title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {m.member_name} · {formatDateTime(m.done_at)}
                          {m.approver_name ? ` · aprovada por ${m.approver_name}` : ""}
                        </p>
                      </div>
                      <span className="chip bg-[var(--accent-soft)] text-[var(--accent-strong)]">+{m.xp} XP</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {h.bonus_events.length > 0 || bonusBefore !== 0 ? (
            <Card>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Bônus dado ao Elo</h2>
              {h.bonus_events.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {h.bonus_events.map((b, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="text-[var(--muted)]">
                        {formatDateTime(b.at)} · {b.source === "admin_set" ? "total ajustado" : "bônus somado"}
                      </span>
                      <span className="tabular-nums font-semibold">
                        {b.amount > 0 ? "+" : ""}
                        {b.amount} XP
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {bonusBefore !== 0 ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Mais {formatXp(bonusBefore)} XP de bônus são anteriores a este histórico (o registro começou em 10/10/2026) e não têm data.
                </p>
              ) : null}
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}
