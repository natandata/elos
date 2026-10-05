import Link from "next/link";
import { notFound } from "next/navigation";
import { TournamentBracket } from "@/components/arena/TournamentBracket";
import { TournamentPanel } from "@/components/arena/TournamentPanel";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { ARENAS } from "@/lib/arena/arenas";
import { normalizePrizes, prizeText } from "@/lib/arena/tournament";
import { entryUsers, loadTournamentData } from "@/lib/arena/tournamentServer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/types";

const STATUS: Record<string, string> = { open: "Inscrições abertas", running: "Em andamento", finished: "Terminado", cancelled: "Cancelado" };

export default async function TorneioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireRole("cria", "leader", "admin");
  const admin = createAdminClient();
  if (!admin) return <p className="card p-4 text-sm font-bold">Torneios indisponíveis no momento.</p>;
  const data = await loadTournamentData(admin, id);
  if (!data) notFound();
  const { t, entries, matches, people, labels } = data;

  const confirmed = entries.filter((e) => e.confirmed);
  const mine = entries.find((e) => e.user_id === profile.id || e.partner_id === profile.id) ?? null;
  const myConfirmed = mine && mine.confirmed ? mine : null;
  const invites = entries
    .filter((e) => e.partner_id === profile.id && !e.confirmed)
    .map((e) => ({ entryId: e.id, fromName: people.get(e.user_id)?.name ?? "Um colega" }));

  // colegas do meu Elo, livres neste torneio (a sessão enxerga só o próprio Elo)
  let mates: { id: string; name: string }[] = [];
  if (t.format === "duo" && profile.elo_id && t.status === "open" && !mine) {
    const supabase = await createClient();
    const taken = new Set(entries.flatMap(entryUsers));
    const { data: ms } = await supabase.from("profiles").select("id, full_name, role").eq("elo_id", profile.elo_id).in("role", ["cria", "leader"]).neq("id", profile.id).order("full_name");
    mates = ((ms ?? []) as { id: string; full_name: string }[]).filter((m) => !taken.has(m.id)).map((m) => ({ id: m.id, name: m.full_name || "Sem nome" }));
  }

  const arena = ARENAS[t.arena] ?? ARENAS[0];
  const prizes = normalizePrizes(t.prizes);
  const places = [prizes.p1, prizes.p2, prizes.p3].slice(0, prizes.places);
  const full = !!t.max_entries && entries.length >= t.max_entries;
  const results = Array.isArray(t.results) ? t.results : [];

  return (
    <>
      <PageHeader title={`🏆 ${t.name}`} subtitle={`${t.format === "duo" ? "Duplas" : "1x1"} · ${STATUS[t.status] ?? t.status}`} />

      <div className="card mb-4 flex items-center gap-3 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={arena.art} alt="" className="h-20 w-auto shrink-0" draggable={false} />
        <div className="min-w-0 text-sm font-semibold">
          <p className="font-black">{arena.name}</p>
          <p className="text-[var(--muted)]">Arena do torneio: todo mundo joga nela, mesmo quem ainda não a liberou.</p>
          {t.starts_at ? <p className="text-xs text-[var(--muted)]">Início: {formatDateTime(t.starts_at)}</p> : null}
          {t.max_entries ? <p className="text-xs text-[var(--muted)]">Vagas: {confirmed.length}/{t.max_entries}</p> : null}
        </div>
      </div>

      {t.description ? <p className="mb-4 whitespace-pre-line text-sm font-semibold">{t.description}</p> : null}

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Premiação</h2>
        <ul className="space-y-1.5">
          {places.map((p, i) => (
            <li key={i} className="card flex items-center gap-3 p-2.5 text-sm font-bold">
              <span className="text-2xl" aria-hidden>
                {["🥇", "🥈", "🥉"][i]}
              </span>
              {i + 1}º lugar
              <span className="ml-auto text-right text-amber-600">{prizeText(p)}</span>
            </li>
          ))}
        </ul>
        {t.format === "duo" ? <p className="mt-1 text-xs text-[var(--muted)]">Nas duplas, cada jogador da dupla recebe o prêmio.</p> : null}
      </section>

      {t.rules ? (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Regras</h2>
          <p className="card whitespace-pre-line p-3 text-sm font-semibold">{t.rules}</p>
        </section>
      ) : null}

      {t.status === "open" || mine || invites.length > 0 ? (
        <section className="mb-4">
          <TournamentPanel
            tournamentId={t.id}
            format={t.format}
            open={t.status === "open"}
            full={full}
            myEntry={mine ? { id: mine.id, confirmed: mine.confirmed, partnerName: mine.user_id === profile.id ? (mine.partner_id ? (people.get(mine.partner_id)?.name ?? null) : null) : (people.get(mine.user_id)?.name ?? null), iAmCaptain: mine.user_id === profile.id } : null}
            invites={invites}
            mates={mates}
          />
        </section>
      ) : null}

      {t.status === "finished" && results.length > 0 ? (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Pódio</h2>
          <ul className="space-y-1.5">
            {results.map((r) => (
              <li key={r.place} className="card flex items-center gap-3 p-2.5 text-sm font-bold">
                <span className="text-2xl" aria-hidden>
                  {["🥇", "🥈", "🥉"][r.place - 1]}
                </span>
                <span className="min-w-0 flex-1 truncate">{labels[r.entryId]?.names.join(" + ") ?? "?"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {matches.length > 0 ? (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Chaveamento</h2>
          <TournamentBracket matches={matches} labels={labels} myEntryId={myConfirmed?.id ?? null} running={t.status === "running"} />
        </section>
      ) : null}

      <section className="mb-4">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          {t.format === "duo" ? "Duplas inscritas" : "Inscritos"} ({confirmed.length})
        </h2>
        {confirmed.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Ninguém se inscreveu ainda.</p>
        ) : (
          <ul className="space-y-1.5">
            {confirmed.map((e) => (
              <li key={e.id} className="card flex items-center gap-2 p-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-bold">{labels[e.id]?.names.join(" + ")}</span>
                {labels[e.id]?.elo ? <span className="shrink-0 text-xs text-[var(--muted)]">{labels[e.id]?.elo}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/app/jogos/arena/torneios" className="btn btn-ghost w-full">
        ← Todos os torneios
      </Link>
    </>
  );
}
