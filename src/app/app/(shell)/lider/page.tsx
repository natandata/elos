import Link from "next/link";
import { ArenaLaunchCard } from "@/components/games/ArenaLaunchCard";
import { EbdAnnouncement } from "@/components/games/EbdAnnouncement";
import { DevotionalSuggestionCard } from "@/components/devotional/DevotionalSuggestionCard";
import { BirthdayCard } from "@/components/BirthdayCard";
import { PageHeader } from "@/components/ui";
import { GradientCard, SoftTile } from "@/components/home/GradientCard";
import { Avatar } from "@/components/Avatar";
import { needsWeeklyPushNudge, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WeeklyPushNudge } from "@/components/push/WeeklyPushNudge";
import { XpBar } from "@/components/XpBar";
import { HojeNoElos } from "@/components/HojeNoElos";
import { EventCountdown } from "@/components/EventCountdown";
import { CriaDaSemana } from "@/components/CriaDaSemana";
import { OpenChallengeBanner } from "@/components/OpenChallengeBanner";
import { StoriesTray } from "@/components/profile/StoriesTray";
import { HomeHighlights } from "@/components/home/HomeHighlights";
import { getEloStoriesTray } from "@/lib/stories";
import { statusDayCutoffUTC } from "@/lib/auth";
import {
  STATUS_LABEL,
  STATUS_TONE,
  formatDate,
  formatXp,
  hasBadStatus,
  relativeDay,
  type StatusLevel,
} from "@/lib/types";

// "Online agora" pro contador ao vivo do Elo — mesma janela usada no admin
// pra marcar presença (ver src/app/app/(shell)/admin/usuarios/page.tsx).
const ONLINE_WINDOW_MS = 60_000;

// Mesmo formato de public.leader_rankings() já usado em /app/ranking.
type LeaderRankRow = {
  leader_id: string;
  leader_name: string;
  leader_avatar_url: string | null;
  elo_id: string | null;
  elo_name: string | null;
  missions_created: number;
  missions_xp: number;
  missions_completed: number;
};

export default async function LiderDashboard() {
  const { profile, viewingAs } = await requireRole("leader");
  const supabase = await createClient();
  const showPushNudge = !viewingAs && (await needsWeeklyPushNudge(supabase, profile));

  const { data: links } = await supabase
    .from("leader_crias")
    .select("profiles:cria_id(id, full_name, xp, avatar_url)")
    .eq("leader_id", profile.id);

  const crias = ((links ?? []) as unknown as {
    profiles: { id: string; full_name: string; xp: number; avatar_url: string | null } | null;
  }[])
    .map((r) => r.profiles)
    .filter((p): p is { id: string; full_name: string; xp: number; avatar_url: string | null } => Boolean(p))
    .sort((a, b) => b.xp - a.xp);

  const criaIds = crias.map((c) => c.id);
  const idFilter = criaIds.length ? criaIds : ["00000000-0000-0000-0000-000000000000"];

  const [
    eloRes,
    rankRes,
    leaderRankRes,
    statusRes,
    followUpsRes,
    awaitingRes,
    approvedRes,
    activeRes,
    eventsRes,
    presenceRes,
    feedTodayRes,
    dueTodayRes,
    eloMembersRes,
    weeklyRankRes,
    challengeRes,
  ] = await Promise.all([
      profile.elo_id
        ? supabase.from("elos").select("name").eq("id", profile.elo_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.rpc("elo_rankings"),
      supabase.rpc("leader_rankings"),
      supabase
        .from("v_latest_status")
        .select("id, user_id, emotional_status, spiritual_status, created_at")
        .in("user_id", idFilter),
      supabase.from("status_follow_ups").select("status_response_id"),
      supabase
        .from("mission_assignments")
        .select("id", { count: "exact", head: true })
        .eq("status", "awaiting_approval")
        .in("cria_id", idFilter),
      supabase
        .from("mission_assignments")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .in("cria_id", idFilter),
      supabase
        .from("mission_assignments")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "rejected"])
        .in("cria_id", idFilter),
      supabase
        .from("events")
        .select("id, title, event_date, event_time, location")
        .gte("event_date", new Date().toISOString().slice(0, 10))
        .order("event_date")
        .limit(3),
      supabase.from("user_presence").select("last_seen_at").eq("user_id", profile.id).maybeSingle(),
      supabase
        .from("feed_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 3_600_000).toISOString()),
      supabase
        .from("mission_assignments")
        .select("id, missions:mission_id(due_date)")
        .in("status", ["pending", "rejected"])
        .in("cria_id", idFilter),
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
    ]);

  const eloName = (eloRes.data as { name: string } | null)?.name ?? "Sem Elo";
  const ranking = (rankRes.data ?? []) as {
    elo_id: string;
    elo_name: string;
    total_xp: number;
    rank_position: number;
  }[];
  const myRank = ranking.find((r) => r.elo_id === profile.elo_id);

  // mesmo desempate em cascata usado em /app/ranking: criadas > nível (XP) > concluídas
  const leaderRanking = ((leaderRankRes.data ?? []) as LeaderRankRow[])
    .map((r) => ({
      ...r,
      missions_created: Number(r.missions_created),
      missions_xp: Number(r.missions_xp),
      missions_completed: Number(r.missions_completed),
    }))
    .sort(
      (a, b) =>
        b.missions_created - a.missions_created ||
        b.missions_xp - a.missions_xp ||
        b.missions_completed - a.missions_completed ||
        a.leader_name.localeCompare(b.leader_name),
    );
  const myLeaderPos = leaderRanking.findIndex((l) => l.leader_id === profile.id) + 1;
  const myLeaderStats = leaderRanking.find((l) => l.leader_id === profile.id);

  const statuses = (statusRes.data ?? []) as {
    id: string;
    user_id: string;
    emotional_status: StatusLevel;
    spiritual_status: StatusLevel;
    created_at: string;
  }[];
  const byUser = new Map(statuses.map((s) => [s.user_id, s]));

  const resolvedIds = new Set(
    ((followUpsRes.data ?? []) as { status_response_id: string }[]).map((f) => f.status_response_id),
  );

  const avgXp = crias.length
    ? Math.round(crias.reduce((sum, c) => sum + c.xp, 0) / crias.length)
    : 0;

  const awaiting = awaitingRes.count ?? 0;

  // só entra no alerta quem está "Mal" e ainda não teve um "o que foi feito" registrado
  const badCrias = crias.filter((c) => {
    const s = byUser.get(c.id);
    return hasBadStatus(s) && !resolvedIds.has(s!.id);
  });

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
      <PageHeader
        title={`Olá, ${(profile.full_name || "Líder").split(" ")[0]}!`}
        subtitle={`${eloName} · ${crias.length} cria(s) sob sua responsabilidade.`}
      />
      <HomeHighlights />

      <WeeklyPushNudge eligible={showPushNudge} />

      <BirthdayCard meId={profile.id} />

      <EbdAnnouncement />

      <ArenaLaunchCard />

      <StoriesTray entries={storiesTray} myUserId={profile.id} />

      <HojeNoElos
        daysSinceLastVisit={daysSinceLastVisit}
        feedPostsToday={feedTodayRes.count ?? 0}
        missionsDueToday={missionsDueToday}
        statusAnswered={statusTodayRes.count ?? 0}
        statusTotal={eloMemberIds.length}
        onlineNow={onlineRes.count ?? 0}
      />

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

      {badCrias.length > 0 ? (
        <GradientCard tone="alarm" href="/app/lider/status-crias" ariaLabel="Alerta de status">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              🚨
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-black">
                {badCrias.length === 1
                  ? `${badCrias[0].full_name || "Um cria"} respondeu "Mal" no status`
                  : `${badCrias.length} crias responderam "Mal" no status`}
              </span>
              <span className="block text-sm text-[var(--muted)]">Toque para ver e agir agora.</span>
            </span>
            <span aria-hidden className="text-xl text-[var(--accent-strong)]">
              →
            </span>
          </div>
        </GradientCard>
      ) : null}

      {awaiting > 0 ? (
        <GradientCard tone="indigo" href="/app/lider/missoes" ariaLabel="Missões aguardando aprovação">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold">
              <span aria-hidden>✅ </span>
              {awaiting} missão(ões) aguardando aprovação
            </span>
            <span aria-hidden className="text-xl text-[var(--accent-strong)]">
              →
            </span>
          </div>
        </GradientCard>
      ) : null}

      <GradientCard tone="indigo" title="Seu XP de liderança" dataTour="xp-card">
        <p className="text-4xl font-black tabular-nums">{formatXp(profile.xp)}</p>
        <div className="mt-3 max-w-sm">
          <XpBar xp={profile.xp} />
        </div>
      </GradientCard>

      <GradientCard tone="aurora" title="Sua posição entre os líderes" action={{ href: "/app/ranking", label: "ver ranking completo →" }}>
        <div className="flex items-center gap-3">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-3xl font-black tabular-nums text-[var(--accent-ink)]">
            {myLeaderPos || "—"}
          </span>
          <span className="text-sm text-[var(--muted)]">{leaderRanking.length > 0 ? `de ${leaderRanking.length} líder(es)` : ""}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <SoftTile tone="yellow" icon="🎯">
            <p className="text-xl font-black tabular-nums">{myLeaderStats?.missions_created ?? 0}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#4a3f66]">criadas</p>
          </SoftTile>
          <SoftTile tone="blue" icon="⭐">
            <p className="text-xl font-black tabular-nums">{formatXp(myLeaderStats?.missions_xp ?? 0)}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#4a3f66]">XP em missões</p>
          </SoftTile>
          <SoftTile tone="green" icon="✅">
            <p className="text-xl font-black tabular-nums">{myLeaderStats?.missions_completed ?? 0}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#4a3f66]">concluídas</p>
          </SoftTile>
        </div>
      </GradientCard>

      <GradientCard tone="sunrise" title="Ranking do seu Elo" action={crias.length > 5 ? { href: "/app/ranking", label: "ver todos →" } : undefined}>
        {crias.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nenhum cria vinculado ainda. Fale com a administração.</p>
        ) : (
          <ol className="space-y-1">
            {crias.slice(0, 5).map((c, i) => {
              const medal = ["bg-amber-400 text-amber-950", "bg-slate-300 text-slate-800", "bg-orange-400 text-orange-950"][i];
              return (
                <li
                  key={c.id}
                  className={`flex items-center justify-between gap-3 rounded-xl px-2 py-2 ${i === 0 ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : ""}`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums ${medal ?? "bg-[var(--bg)] text-[var(--muted)]"}`}>
                      {i + 1}
                    </span>
                    <Avatar url={c.avatar_url} name={c.full_name} size={30} />
                    <span className={`truncate ${i === 0 ? "text-base font-bold" : "text-sm font-medium"}`}>{c.full_name || "Sem nome"}</span>
                  </span>
                  <span className={`shrink-0 tabular-nums ${i === 0 ? "text-sm font-bold" : "text-xs text-[var(--muted)]"}`}>{formatXp(c.xp)} XP</span>
                </li>
              );
            })}
          </ol>
        )}
      </GradientCard>

      <GradientCard tone="ocean" title="Resumo do seu Elo">
        <div className="grid grid-cols-2 gap-2.5">
          <SoftTile tone="blue" icon="👥" label="Crias">
            <p className="text-3xl font-black tabular-nums leading-none">{crias.length}</p>
          </SoftTile>
          <SoftTile tone="yellow" icon="⭐" label="XP médio">
            <p className="text-3xl font-black tabular-nums leading-none">{formatXp(avgXp)}</p>
          </SoftTile>
          <SoftTile tone="peach" icon="🏆" label="Ranking do Elo">
            <p className="text-3xl font-black tabular-nums leading-none">{myRank ? `${myRank.rank_position}º` : "—"}</p>
            {myRank ? <p className="mt-1 text-xs font-bold text-[#4a3f66]">{formatXp(Number(myRank.total_xp))} XP no total</p> : null}
          </SoftTile>
          <SoftTile tone="green" icon="✅" label="Missões aprovadas">
            <p className="text-3xl font-black tabular-nums leading-none">{approvedRes.count ?? 0}</p>
          </SoftTile>
        </div>
      </GradientCard>

      <GradientCard tone="aurora" title="Status dos crias" action={{ href: "/app/lider/status-crias", label: "ver tudo" }}>
        {crias.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nenhum cria vinculado ainda. Fale com a administração.</p>
        ) : (
          <ul className="space-y-2">
            {[...crias]
              .sort((a, b) => Number(hasBadStatus(byUser.get(b.id))) - Number(hasBadStatus(byUser.get(a.id))))
              .slice(0, 5)
              .map((c) => {
                const st = byUser.get(c.id);
                const bad = hasBadStatus(st);
                return (
                  <li key={c.id} className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm ${bad ? "bg-red-50 ring-1 ring-red-300" : ""}`}>
                    <span className={`truncate font-medium ${bad ? "text-red-900" : ""}`}>
                      {bad ? <span aria-hidden>🚨 </span> : null}
                      {c.full_name || "Sem nome"}
                    </span>
                    {st ? (
                      <span className="flex shrink-0 gap-1">
                        <span className={`chip ${STATUS_TONE[st.emotional_status]}`}>{STATUS_LABEL[st.emotional_status]}</span>
                        <span className={`chip ${STATUS_TONE[st.spiritual_status]}`}>{STATUS_LABEL[st.spiritual_status]}</span>
                      </span>
                    ) : (
                      <span className="chip border-[var(--line)] text-[var(--muted)]">sem resposta</span>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </GradientCard>

      <GradientCard tone="indigo" title="Missões" action={{ href: "/app/lider/missoes", label: "Gerenciar missões →" }}>
        <div className="grid grid-cols-3 gap-2.5">
          <SoftTile tone="blue" icon="🎯">
            <p className="text-2xl font-black tabular-nums leading-none">{activeRes.count ?? 0}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#4a3f66]">ativas</p>
          </SoftTile>
          <SoftTile tone="yellow" icon="⏳">
            <p className="text-2xl font-black tabular-nums leading-none">{awaiting}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#4a3f66]">aguardando</p>
          </SoftTile>
          <SoftTile tone="green" icon="✅">
            <p className="text-2xl font-black tabular-nums leading-none">{approvedRes.count ?? 0}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#4a3f66]">concluídas</p>
          </SoftTile>
        </div>
      </GradientCard>

      <DevotionalSuggestionCard />

      <GradientCard tone="sunrise" title="Próximos eventos">
        {(eventsRes.data ?? []).length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nenhum evento agendado.</p>
        ) : (
          <div className="space-y-2">
            {((eventsRes.data ?? []) as {
              id: string;
              title: string;
              event_date: string;
              event_time: string | null;
              location: string | null;
            }[]).map((e, i) => (
              <SoftTile key={e.id} tone={(["peach", "yellow", "pink", "blue"] as const)[i % 4]} icon="📅">
                <p className="font-black">{e.title}</p>
                <p className="text-xs font-semibold text-[#4a3f66]">
                  {formatDate(e.event_date)}
                  {e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </SoftTile>
            ))}
          </div>
        )}
      </GradientCard>

      <p className="mt-6 text-xs text-[var(--muted)]">
        Última resposta de status dos crias atualizada {relativeDay(statuses[0]?.created_at ?? null).toLowerCase()}.
      </p>
    </>
  );
}
