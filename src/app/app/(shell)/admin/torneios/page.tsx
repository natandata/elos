import { TournamentBracket } from "@/components/arena/TournamentBracket";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { ARENAS } from "@/lib/arena/arenas";
import { normalizePrizes, prizeText } from "@/lib/arena/tournament";
import { loadTournamentData } from "@/lib/arena/tournamentServer";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/types";
import { TournamentAdminActions } from "./TournamentAdminActions";
import { TournamentForm } from "./TournamentForm";

const STATUS: Record<string, string> = { open: "Inscrições abertas", running: "Em andamento", finished: "Terminado", cancelled: "Cancelado" };

/** "YYYY-MM-DDTHH:mm" em horário de Brasília (UTC-3) pra preencher o campo de data. */
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 16) : "");

export default async function AdminTorneiosPage() {
  await requireRole("admin");
  const admin = createAdminClient();
  if (!admin) return <p className="card p-4 text-sm font-bold">Falta a chave de serviço do banco no servidor.</p>;

  const { data: list } = await admin.from("arena_tournaments").select("id").order("created_at", { ascending: false }).limit(30);
  const all = (await Promise.all(((list ?? []) as { id: string }[]).map((r) => loadTournamentData(admin, r.id)))).filter((d): d is NonNullable<typeof d> => !!d);

  return (
    <>
      <PageHeader title="🏆 Torneios da Arena" subtitle="Crie torneios 1x1 ou em duplas, escolha a arena e a premiação, e acompanhe o chaveamento." />

      <details className="card mb-5 p-4" open={all.length === 0}>
        <summary className="cursor-pointer text-base font-black">➕ Novo torneio</summary>
        <div className="mt-3">
          <TournamentForm />
        </div>
      </details>

      <div className="space-y-4">
        {all.map(({ t, entries, matches, labels }) => {
          const confirmed = entries.filter((e) => e.confirmed);
          const pending = entries.filter((e) => !e.confirmed);
          const arena = ARENAS[t.arena] ?? ARENAS[0];
          const prizes = normalizePrizes(t.prizes);
          return (
            <section key={t.id} className="card p-4">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={arena.art} alt="" className="h-14 w-auto shrink-0" draggable={false} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black leading-tight">{t.name}</h2>
                  <p className="text-xs font-bold text-[var(--muted)]">
                    {t.format === "duo" ? "👥 Duplas" : "⚔️ 1x1"} · {arena.name} · {STATUS[t.status]}
                    {t.starts_at ? ` · início ${formatDateTime(t.starts_at)}` : ""}
                  </p>
                  <p className="text-xs font-bold text-amber-600">
                    {[prizes.p1, prizes.p2, prizes.p3].slice(0, prizes.places).map((p, i) => `${["🥇", "🥈", "🥉"][i]} ${prizeText(p)}`).join("  ·  ")}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <TournamentAdminActions id={t.id} status={t.status} confirmed={confirmed.length} />
              </div>

              <p className="mt-3 text-sm font-black">
                {t.format === "duo" ? "Duplas" : "Inscritos"}: {confirmed.length}
                {t.max_entries ? `/${t.max_entries}` : ""}
                {pending.length > 0 ? <span className="font-bold text-amber-600"> · {pending.length} esperando parceiro</span> : null}
              </p>
              {confirmed.length > 0 ? (
                <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                  {confirmed.map((e) => (
                    <li key={e.id} className="truncate rounded-lg bg-[var(--bg)] px-2 py-1 font-semibold">
                      {labels[e.id]?.names.join(" + ")}
                      {labels[e.id]?.elo ? <span className="text-xs text-[var(--muted)]"> · {labels[e.id]?.elo}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {matches.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-black">Chaveamento</p>
                  <TournamentBracket matches={matches} labels={labels} myEntryId={null} admin running={t.status === "running"} />
                  {t.status === "running" ? <p className="mt-1 text-xs text-[var(--muted)]">Se alguém não aparecer ou houver problema, dê a vitória na mão pelo botão &quot;Vence&quot;.</p> : null}
                </div>
              ) : null}

              {t.status === "finished" && Array.isArray(t.results) && t.results.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-1 text-sm font-black">Resultado e prêmios entregues</p>
                  <ul className="space-y-1 text-sm font-semibold">
                    {t.results.map((r) => (
                      <li key={r.place}>
                        {["🥇", "🥈", "🥉"][r.place - 1]} {labels[r.entryId]?.names.join(" + ")} — {prizeText(r.prize)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {t.status === "open" ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-black text-[var(--accent-strong)]">✏️ Editar torneio</summary>
                  <div className="mt-3">
                    <TournamentForm
                      item={{ id: t.id, name: t.name, description: t.description, rules: t.rules, format: t.format, arena: t.arena, max_entries: t.max_entries, prizes: t.prizes, startsLocal: toLocalInput(t.starts_at) }}
                    />
                  </div>
                </details>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
