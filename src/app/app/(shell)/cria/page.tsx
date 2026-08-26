import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatXp } from "@/lib/types";

export default async function CriaDashboard() {
  const { profile } = await requireRole("cria");
  const supabase = await createClient();

  const [eloRes, rankingRes, pendingRes, awaitingRes, approvedRes, eventsRes] = await Promise.all([
    profile.elo_id
      ? supabase.from("elos").select("name").eq("id", profile.elo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.elo_id
      ? supabase
          .from("profiles")
          .select("id, full_name, xp")
          .eq("elo_id", profile.elo_id)
          .eq("role", "cria")
          .order("xp", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("mission_assignments")
      .select("id", { count: "exact", head: true })
      .eq("cria_id", profile.id)
      .in("status", ["pending", "rejected"]),
    supabase
      .from("mission_assignments")
      .select("id", { count: "exact", head: true })
      .eq("cria_id", profile.id)
      .eq("status", "awaiting_approval"),
    supabase
      .from("mission_assignments")
      .select("id", { count: "exact", head: true })
      .eq("cria_id", profile.id)
      .eq("status", "approved"),
    supabase
      .from("events")
      .select("id, title, event_date, event_time, location")
      .gte("event_date", new Date().toISOString().slice(0, 10))
      .order("event_date")
      .limit(3),
  ]);

  const ranking = (rankingRes.data ?? []) as { id: string; full_name: string; xp: number }[];
  const position = ranking.findIndex((r) => r.id === profile.id) + 1;
  const eloName = (eloRes.data as { name: string } | null)?.name ?? "Sem Elo";

  return (
    <>
      <PageHeader title={`Olá, ${(profile.full_name || "Cria").split(" ")[0]}!`} subtitle={eloName} />

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[var(--accent)] p-5 text-[var(--accent-ink)] sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">Seu XP</p>
          <p className="mt-1 text-4xl font-black tabular-nums">{formatXp(profile.xp)}</p>
          <p className="mt-1 text-sm font-semibold opacity-90">
            {position > 0 ? `#${position} no seu Elo` : "Sem posição ainda"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <Link href="/app/cria/missoes" className="card p-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">Disponíveis</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{pendingRes.count ?? 0}</p>
          </Link>
          <Link href="/app/cria/missoes" className="card p-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">Aguardando</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{awaitingRes.count ?? 0}</p>
          </Link>
        </div>
      </section>

      <section className="mb-5 grid gap-3 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Ranking do seu Elo</h2>
            <Link href="/app/ranking" className="text-xs font-semibold text-[var(--accent-strong)]">
              ver tudo
            </Link>
          </div>
          {ranking.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Ninguém pontuou ainda.</p>
          ) : (
            <ol className="space-y-2">
              {ranking.slice(0, 5).map((r, i) => (
                <li
                  key={r.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    r.id === profile.id
                      ? "bg-[var(--accent-soft)] font-bold text-[var(--accent-strong)]"
                      : ""
                  }`}
                >
                  <span className="truncate">
                    {i + 1}º {r.full_name || "Sem nome"}
                  </span>
                  <span className="tabular-nums">{formatXp(r.xp)} XP</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold">Suas missões</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Disponíveis</span>
              <strong className="tabular-nums">{pendingRes.count ?? 0}</strong>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Aguardando aprovação</span>
              <strong className="tabular-nums">{awaitingRes.count ?? 0}</strong>
            </li>
            <li className="flex justify-between">
              <span className="text-[var(--muted)]">Aprovadas</span>
              <strong className="tabular-nums">{approvedRes.count ?? 0}</strong>
            </li>
          </ul>
          <Link href="/app/cria/missoes" className="btn btn-primary mt-4 w-full !py-2 !text-sm">
            Ver missões
          </Link>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Próximos eventos
        </h2>
        {(eventsRes.data ?? []).length === 0 ? (
          <EmptyState>Nenhum evento agendado.</EmptyState>
        ) : (
          <div className="space-y-2">
            {((eventsRes.data ?? []) as {
              id: string;
              title: string;
              event_date: string;
              event_time: string | null;
              location: string | null;
            }[]).map((e) => (
              <Card key={e.id}>
                <p className="font-semibold">{e.title}</p>
                <p className="text-xs text-[var(--muted)]">
                  {formatDate(e.event_date)}
                  {e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
