import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { needsWeeklyPushNudge, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WeeklyPushNudge } from "@/components/push/WeeklyPushNudge";
import { CriaCareMeetingCard } from "@/components/care/CriaCareMeetingCard";
import { XpBar } from "@/components/XpBar";
import { HojeNoElos } from "@/components/HojeNoElos";
import { EventCountdown } from "@/components/EventCountdown";
import { CriaDaSemana } from "@/components/CriaDaSemana";
import { OpenChallengeBanner } from "@/components/OpenChallengeBanner";
import { MissionSpotlight, type SpotlightMission } from "@/components/missions/MissionSpotlight";
import { StoriesTray } from "@/components/profile/StoriesTray";
import { getEloStoriesTray } from "@/lib/stories";
import { statusDayCutoffUTC } from "@/lib/auth";
import { formatDate, formatXp, type CareMeeting } from "@/lib/types";

// "Online agora" pro contador ao vivo do Elo — mesma janela usada no admin
// pra marcar presença (ver src/app/app/(shell)/admin/usuarios/page.tsx).
const ONLINE_WINDOW_MS = 60_000;

export default async function CriaDashboard() {
  const { profile, viewingAs } = await requireRole("cria");
  const supabase = await createClient();
  const showPushNudge = !viewingAs && (await needsWeeklyPushNudge(supabase, profile));

  const [
    eloRes,
    rankingRes,
    pendingRes,
    awaitingRes,
    approvedRes,
    eventsRes,
    meetingsRes,
    presenceRes,
    feedTodayRes,
    dueTodayRes,
    eloMembersRes,
    weeklyRankRes,
    challengeRes,
    topSuggestionRes,
    spotlightRes,
  ] = await Promise.all([
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
    supabase
      .from("care_meetings")
      .select("*")
      .eq("cria_id", profile.id)
      .in("status", ["pending_leader", "pending_cria", "confirmed"])
      .order("created_at", { ascending: false }),
    supabase.from("user_presence").select("last_seen_at").eq("user_id", profile.id).maybeSingle(),
    supabase
      .from("feed_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 3_600_000).toISOString()),
    supabase
      .from("mission_assignments")
      .select("id, missions:mission_id(due_date)")
      .eq("cria_id", profile.id)
      .in("status", ["pending", "rejected"]),
    profile.elo_id
      ? supabase.from("profiles").select("id").eq("elo_id", profile.elo_id).in("role", ["cria", "leader"])
      : Promise.resolve({ data: [] }),
    profile.elo_id
      ? supabase.rpc("weekly_xp_ranking", { p_elo_id: profile.elo_id })
      : Promise.resolve({ data: [] }),
    supabase
      .from("elo_challenges")
      .select("title, description, bonus_xp")
      .eq("status", "open")
      .maybeSingle(),
    supabase
      .from("v_suggestions")
      .select("id, content, hype_count")
      .order("hype_count", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Em destaque na Home: as próprias missões ainda por fazer, mais
    // próximas do prazo primeiro — é essa lista que gera urgência.
    supabase
      .from("mission_assignments")
      .select("id, missions:mission_id(id, title, xp, due_date)")
      .eq("cria_id", profile.id)
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const ranking = (rankingRes.data ?? []) as { id: string; full_name: string; xp: number }[];
  const position = ranking.findIndex((r) => r.id === profile.id) + 1;
  const eloName = (eloRes.data as { name: string } | null)?.name ?? "Sem Elo";
  const meetings = (meetingsRes.data ?? []) as CareMeeting[];
  const storiesTray = await getEloStoriesTray(supabase, profile.elo_id, profile.id);

  const eloMemberIds = ((eloMembersRes.data ?? []) as { id: string }[]).map((m) => m.id);
  const [statusTodayRes, onlineRes] = eloMemberIds.length
    ? await Promise.all([
        supabase
          .from("status_responses")
          .select("user_id", { count: "exact", head: true })
          .in("user_id", eloMemberIds)
          .gte("created_at", statusDayCutoffUTC().toISOString()),
        supabase
          .from("user_presence")
          .select("user_id", { count: "exact", head: true })
          .in("user_id", eloMemberIds)
          .gte("last_seen_at", new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()),
      ])
    : [{ count: 0 }, { count: 0 }];

  const weeklyTop = ((weeklyRankRes.data ?? []) as {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    weekly_xp: number;
  }[])[0];

  const spotlightRows = (
    (spotlightRes.data ?? []) as unknown as {
      id: string;
      missions: { id: string; title: string; xp: number; due_date: string | null } | null;
    }[]
  )
    .filter((r) => r.missions)
    .sort((a, b) => (a.missions!.due_date ?? "9999").localeCompare(b.missions!.due_date ?? "9999"));

  const spotlightMissionIds = spotlightRows.map((r) => r.missions!.id);
  const progressRes = spotlightMissionIds.length
    ? await supabase.rpc("mission_elo_progress", { p_mission_ids: spotlightMissionIds })
    : { data: [] };
  const progressByMission = new Map(
    (
      (progressRes.data ?? []) as {
        mission_id: string;
        total_approved: number;
        leading_elo_id: string | null;
        leading_elo_name: string | null;
        leading_elo_count: number | null;
      }[]
    ).map((p) => [p.mission_id, p]),
  );

  const spotlightMissions: SpotlightMission[] = spotlightRows.map((r) => {
    const progress = progressByMission.get(r.missions!.id);
    return {
      assignmentId: r.id,
      title: r.missions!.title,
      xp: r.missions!.xp,
      dueDate: r.missions!.due_date,
      totalApproved: progress?.total_approved ?? 0,
      leadingEloId: progress?.leading_elo_id ?? null,
      leadingEloName: progress?.leading_elo_name ?? null,
      leadingEloCount: progress?.leading_elo_count ?? 0,
    };
  });

  const lastSeenAt = (presenceRes.data as { last_seen_at: string } | null)?.last_seen_at ?? null;
  const daysSinceLastVisit = lastSeenAt
    ? Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 86_400_000)
    : null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const missionsDueToday = (
    (dueTodayRes.data ?? []) as unknown as { missions: { due_date: string | null } | null }[]
  ).filter((r) => r.missions?.due_date === todayStr).length;

  return (
    <>
      <PageHeader title={`Olá, ${(profile.full_name || "Cria").split(" ")[0]}!`} subtitle={eloName} />

      <WeeklyPushNudge eligible={showPushNudge} />

      <Link
        href="/app/chat/ajuda"
        className="mb-5 flex items-center justify-between gap-3 rounded-2xl border-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-[var(--accent-strong)]"
      >
        <span className="flex items-center gap-2 font-bold">
          <span aria-hidden>🆘</span> Preciso de ajuda
        </span>
        <span className="text-sm font-semibold opacity-80">Falar com meu líder →</span>
      </Link>

      <StoriesTray entries={storiesTray} myUserId={profile.id} />

      <HojeNoElos
        daysSinceLastVisit={daysSinceLastVisit}
        feedPostsToday={feedTodayRes.count ?? 0}
        missionsDueToday={missionsDueToday}
        statusAnswered={statusTodayRes.count ?? 0}
        statusTotal={eloMemberIds.length}
        onlineNow={onlineRes.count ?? 0}
      />

      <MissionSpotlight missions={spotlightMissions} myEloId={profile.elo_id} />

      {challengeRes.data ? (
        <OpenChallengeBanner
          title={(challengeRes.data as { title: string }).title}
          description={(challengeRes.data as { description: string | null }).description}
          bonusXp={(challengeRes.data as { bonus_xp: number }).bonus_xp}
        />
      ) : null}

      {(eventsRes.data as { title: string; event_date: string }[] | null)?.[0] ? (
        <EventCountdown
          title={(eventsRes.data as { title: string; event_date: string }[])[0].title}
          eventDate={(eventsRes.data as { title: string; event_date: string }[])[0].event_date}
        />
      ) : null}

      {weeklyTop && weeklyTop.weekly_xp > 0 ? (
        <CriaDaSemana
          name={weeklyTop.full_name || "Sem nome"}
          avatarUrl={weeklyTop.avatar_url}
          weeklyXp={Number(weeklyTop.weekly_xp)}
          isMe={weeklyTop.user_id === profile.id}
        />
      ) : null}

      {meetings.length > 0 ? (
        <section className="mb-5 space-y-2">
          {meetings.map((m) => (
            <CriaCareMeetingCard key={m.id} meeting={m} />
          ))}
        </section>
      ) : null}

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <div
          data-tour="xp-card"
          className="rounded-2xl bg-[var(--accent)] p-5 text-[var(--accent-ink)] sm:col-span-2"
        >
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">Seu XP</p>
          <p className="mt-1 text-4xl font-black tabular-nums">{formatXp(profile.xp)}</p>
          <div className="mt-3">
            <XpBar xp={profile.xp} tone="onAccent" />
          </div>
          <p className="mt-2 text-sm font-semibold opacity-90">
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

      {topSuggestionRes.data ? (
        <Link href="/app/mural" className="card mb-5 block p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold">💡 Mural de Sugestões</h2>
            <span className="text-xs font-semibold text-[var(--accent-strong)]">ver tudo →</span>
          </div>
          <p className="mt-2 truncate text-sm text-[var(--muted)]">
            "{(topSuggestionRes.data as { content: string }).content}"
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            🔥 {(topSuggestionRes.data as { hype_count: number }).hype_count} hype — a mais votada até
            agora
          </p>
        </Link>
      ) : (
        <Link href="/app/mural" className="card mb-5 block p-4">
          <h2 className="text-sm font-bold">💡 Mural de Sugestões</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            O que você gostaria de ver no ELOS? Seja o primeiro a escrever!
          </p>
        </Link>
      )}

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
