import { EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Elo, MissionType, Profile } from "@/lib/types";
import { ApprovalItem, type PendingReview } from "./ApprovalItem";
import { LeaderMissionsToggle } from "./LeaderMissionsToggle";
import { MissionComposer, type CriaOption } from "./MissionComposer";
import { MissionManagerCard, type ManagedMission } from "./MissionManagerCard";

type MissionRow = {
  id: string;
  title: string;
  description: string | null;
  type: MissionType;
  xp: number;
  start_date: string | null;
  due_date: string | null;
  created_by: string;
  elos: { name: string } | null;
  creator: { full_name: string; role: string } | null;
  mission_assignments: { id: string; status: string }[];
};

type AssignmentRow = {
  id: string;
  submitted_at: string | null;
  profiles: { full_name: string } | null;
  missions: { title: string; description: string | null; xp: number } | null;
};

function toManagedMission(m: MissionRow, canEdit: boolean, authorName?: string): ManagedMission {
  const a = m.mission_assignments ?? [];
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    type: m.type,
    xp: m.xp,
    start_date: m.start_date,
    due_date: m.due_date,
    eloName: m.elos?.name ?? null,
    authorName,
    counts: {
      total: a.length,
      awaiting: a.filter((x) => x.status === "awaiting_approval").length,
      approved: a.filter((x) => x.status === "approved").length,
      rejected: a.filter((x) => x.status === "rejected").length,
    },
    canEdit,
  };
}

/** Área de missões compartilhada por Admin e Líder. */
export async function MissionsWorkspace({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const isAdmin = profile.role === "admin";

  const [elosRes, criasRes, missionsRes, pendingRes] = await Promise.all([
    supabase.from("elos").select("*").order("gender").order("age_range"),
    isAdmin
      ? supabase.from("profiles").select("id, full_name, elo_id").eq("role", "cria").order("full_name")
      : supabase
          .from("leader_crias")
          .select("profiles:cria_id(id, full_name, elo_id)")
          .eq("leader_id", profile.id),
    supabase
      .from("missions")
      .select(
        "id, title, description, type, xp, start_date, due_date, created_by, elos:elo_id(name), creator:created_by(full_name, role), mission_assignments(id, status)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("mission_assignments")
      .select("id, submitted_at, profiles:cria_id(full_name), missions:mission_id(title, description, xp)")
      .eq("status", "awaiting_approval")
      .order("submitted_at", { ascending: true }),
  ]);

  if (missionsRes.error) return <ErrorState message={missionsRes.error.message} />;

  const elos = (elosRes.data ?? []) as Elo[];

  const crias: CriaOption[] = isAdmin
    ? ((criasRes.data ?? []) as CriaOption[])
    : ((criasRes.data ?? []) as unknown as { profiles: CriaOption | null }[])
        .map((r) => r.profiles)
        .filter((p): p is CriaOption => Boolean(p));

  const allMissions = (missionsRes.data ?? []) as unknown as MissionRow[];

  // Para o líder: as próprias missões ficam separadas das "em curso" criadas
  // por outros líderes — essa segunda lista é a que pode ser ocultada.
  const ownRows = isAdmin ? allMissions : allMissions.filter((m) => m.created_by === profile.id);
  const otherLeaderRows = isAdmin
    ? []
    : allMissions.filter((m) => m.created_by !== profile.id && m.creator?.role === "leader");

  const missions = ownRows.map((m) =>
    toManagedMission(m, isAdmin || m.created_by === profile.id),
  );
  const otherMissions = otherLeaderRows.map((m) =>
    toManagedMission(m, false, m.creator?.full_name || "Outro líder"),
  );

  const pending: PendingReview[] = ((pendingRes.data ?? []) as unknown as AssignmentRow[]).map(
    (r) => ({
      assignmentId: r.id,
      criaName: r.profiles?.full_name || "Cria",
      missionTitle: r.missions?.title || "Missão",
      description: r.missions?.description ?? null,
      xp: r.missions?.xp ?? 0,
      submittedAt: r.submitted_at,
    }),
  );

  return (
    <>
      <PageHeader
        title="Missões"
        subtitle={
          isAdmin
            ? "Crie, edite e aprove missões de todos os ELOS."
            : "Crie missões para seus crias e aprove o que eles enviarem."
        }
      />

      <MissionComposer
        elos={elos}
        crias={crias}
        canTargetAll={isAdmin}
        defaultEloId={isAdmin ? null : profile.elo_id}
      />

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          Aguardando aprovação ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <EmptyState>Nenhuma missão aguardando aprovação.</EmptyState>
        ) : (
          <div className="space-y-3">
            {pending.map((item) => (
              <ApprovalItem key={item.assignmentId} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className={isAdmin ? "" : "mb-6"}>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          {isAdmin ? "Missões criadas" : "Minhas missões"} ({missions.length})
        </h2>
        {missions.length === 0 ? (
          <EmptyState>Nenhuma missão criada ainda.</EmptyState>
        ) : (
          <div className="space-y-3">
            {missions.map((m) => (
              <MissionManagerCard key={m.id} mission={m} />
            ))}
          </div>
        )}
      </section>

      {!isAdmin ? (
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
              Missões em curso de outros líderes ({otherMissions.length})
            </h2>
            <LeaderMissionsToggle show={profile.show_other_leader_missions} />
          </div>
          {!profile.show_other_leader_missions ? (
            <EmptyState>
              Visualização desativada. Use o interruptor acima para mostrar de novo.
            </EmptyState>
          ) : otherMissions.length === 0 ? (
            <EmptyState>Nenhuma missão de outros líderes no momento.</EmptyState>
          ) : (
            <div className="space-y-3">
              {otherMissions.map((m) => (
                <MissionManagerCard key={m.id} mission={m} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
