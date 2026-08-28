import { EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { SubmitMissionButton } from "@/components/missions/SubmitMissionButton";
import {
  ASSIGNMENT_LABEL,
  ASSIGNMENT_TONE,
  formatDate,
  formatDateTime,
  type AssignmentStatus,
  type Elo,
  type MissionType,
  type Profile,
} from "@/lib/types";
import { ApprovalItem, type PendingReview } from "./ApprovalItem";
import { LeaderMissionsToggle } from "./LeaderMissionsToggle";
import { MissionComposer, type CriaOption, type LeaderOption } from "./MissionComposer";
import { MissionManagerCard, type ManagedMission } from "./MissionManagerCard";

type MissionRow = {
  id: string;
  title: string;
  description: string | null;
  type: MissionType;
  xp: number;
  start_date: string | null;
  due_date: string | null;
  publish_at: string | null;
  created_at: string;
  created_by: string;
  audience: "crias" | "leaders" | "general";
  elos: { name: string } | null;
  creator: { full_name: string; role: string } | null;
  mission_assignments: { id: string; status: string }[];
};

type LeadershipAssignmentRow = {
  id: string;
  status: AssignmentStatus;
  submitted_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  missions: { title: string; description: string | null; xp: number; due_date: string | null } | null;
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
    publish_at: m.publish_at,
    created_at: m.created_at,
    eloName: m.elos?.name ?? null,
    audience: m.audience,
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

  const [elosRes, criasRes, leadersRes, missionsRes, pendingRes, myLeadershipRes] = await Promise.all([
    supabase.from("elos").select("*").order("gender").order("age_range"),
    isAdmin
      ? supabase.from("profiles").select("id, full_name, elo_id").eq("role", "cria").order("full_name")
      : supabase
          .from("leader_crias")
          .select("profiles:cria_id(id, full_name, elo_id)")
          .eq("leader_id", profile.id),
    isAdmin
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "leader")
          .eq("approved", true)
          .order("full_name")
      : Promise.resolve({ data: [] }),
    supabase
      .from("missions")
      .select(
        "id, title, description, type, xp, start_date, due_date, publish_at, created_at, created_by, audience, elos:elo_id(name), creator:created_by(full_name, role), mission_assignments(id, status)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("mission_assignments")
      .select("id, submitted_at, profiles:cria_id(full_name), missions:mission_id(title, description, xp)")
      .eq("status", "awaiting_approval")
      .order("submitted_at", { ascending: true }),
    // Missões da Liderança atribuídas a mim (só faz sentido pra líder — admin não é "cria_id" de nada)
    !isAdmin
      ? supabase
          .from("mission_assignments")
          .select("id, status, submitted_at, approved_at, rejection_reason, missions:mission_id(title, description, xp, due_date)")
          .eq("cria_id", profile.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  if (missionsRes.error) return <ErrorState message={missionsRes.error.message} />;

  const elos = (elosRes.data ?? []) as Elo[];

  const crias: CriaOption[] = isAdmin
    ? ((criasRes.data ?? []) as CriaOption[])
    : ((criasRes.data ?? []) as unknown as { profiles: CriaOption | null }[])
        .map((r) => r.profiles)
        .filter((p): p is CriaOption => Boolean(p));

  const leaders: LeaderOption[] = (leadersRes.data ?? []) as LeaderOption[];
  const myLeadership = (myLeadershipRes.data ?? []) as unknown as LeadershipAssignmentRow[];

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
        leaders={isAdmin ? leaders : undefined}
        canTargetAll={isAdmin}
        defaultEloId={isAdmin ? null : profile.elo_id}
      />

      {!isAdmin && myLeadership.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
            Missões da Liderança pra você ({myLeadership.length})
          </h2>
          <div className="space-y-3">
            {myLeadership.map((a) => (
              <div key={a.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="chip mb-1 bg-red-50 font-extrabold uppercase tracking-wide text-red-700">
                      Missão do Admin
                    </span>
                    <p className="font-bold">{a.missions?.title ?? "Missão"}</p>
                    <p className="text-xs text-[var(--muted)]">
                      prazo {formatDate(a.missions?.due_date ?? null)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="chip bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      {a.missions?.xp ?? 0} XP
                    </span>
                    <span className={`chip ${ASSIGNMENT_TONE[a.status]}`}>
                      {ASSIGNMENT_LABEL[a.status]}
                    </span>
                  </div>
                </div>
                {a.missions?.description ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">{a.missions.description}</p>
                ) : null}
                {a.status === "rejected" && a.rejection_reason ? (
                  <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    Recusada: {a.rejection_reason}
                  </p>
                ) : null}
                {a.status === "awaiting_approval" ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Enviada em {formatDateTime(a.submitted_at)}. Aguardando avaliação da administração.
                  </p>
                ) : null}
                {a.status === "approved" ? (
                  <p className="mt-2 text-xs text-emerald-700">
                    Aprovada em {formatDateTime(a.approved_at)} · +{a.missions?.xp ?? 0} XP
                  </p>
                ) : null}
                {a.status === "pending" || a.status === "rejected" ? (
                  <SubmitMissionButton assignmentId={a.id} />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
