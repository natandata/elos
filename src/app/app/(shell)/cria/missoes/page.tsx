import { Card, EmptyState, ErrorState, PageHeader } from "@/components/ui";
import { SubmitMissionButton } from "@/components/missions/SubmitMissionButton";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  ASSIGNMENT_LABEL,
  ASSIGNMENT_TONE,
  MISSION_TYPE_LABEL,
  formatDate,
  formatDateTime,
  type AssignmentStatus,
  type MissionType,
} from "@/lib/types";

type Row = {
  id: string;
  status: AssignmentStatus;
  submitted_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  missions: {
    title: string;
    description: string | null;
    xp: number;
    type: MissionType;
    due_date: string | null;
  } | null;
};

const GROUPS: { status: AssignmentStatus[]; title: string }[] = [
  { status: ["pending", "rejected"], title: "Para fazer" },
  { status: ["awaiting_approval"], title: "Aguardando aprovação" },
  { status: ["approved"], title: "Aprovadas" },
];

export default async function CriaMissoesPage() {
  const { profile } = await requireRole("cria");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mission_assignments")
    .select(
      "id, status, submitted_at, approved_at, rejection_reason, missions:mission_id(title, description, xp, type, due_date)",
    )
    .eq("cria_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) return <ErrorState message={error.message} />;

  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Missões" subtitle="Conclua, envie para aprovação e ganhe XP." />

      {rows.length === 0 ? (
        <EmptyState>Nenhuma missão disponível.</EmptyState>
      ) : (
        <div className="space-y-6">
          {GROUPS.map((group) => {
            const items = rows.filter((r) => group.status.includes(r.status));
            if (items.length === 0) return null;

            return (
              <section key={group.title}>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                  {group.title} ({items.length})
                </h2>
                <div className="space-y-3">
                  {items.map((row) => (
                    <Card key={row.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold">{row.missions?.title ?? "Missão"}</p>
                          <p className="text-xs text-[var(--muted)]">
                            {row.missions ? MISSION_TYPE_LABEL[row.missions.type] : ""} · prazo{" "}
                            {formatDate(row.missions?.due_date ?? null)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="chip bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                            {row.missions?.xp ?? 0} XP
                          </span>
                          <span className={`chip ${ASSIGNMENT_TONE[row.status]}`}>
                            {ASSIGNMENT_LABEL[row.status]}
                          </span>
                        </div>
                      </div>

                      {row.missions?.description ? (
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          {row.missions.description}
                        </p>
                      ) : null}

                      {row.status === "rejected" && row.rejection_reason ? (
                        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                          Recusada: {row.rejection_reason}
                        </p>
                      ) : null}

                      {row.status === "awaiting_approval" ? (
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          Enviada em {formatDateTime(row.submitted_at)}. Aguarde a avaliação da
                          liderança.
                        </p>
                      ) : null}

                      {row.status === "approved" ? (
                        <p className="mt-2 text-xs text-emerald-700">
                          Aprovada em {formatDateTime(row.approved_at)} · +{row.missions?.xp ?? 0} XP
                        </p>
                      ) : null}

                      {row.status === "pending" || row.status === "rejected" ? (
                        <SubmitMissionButton assignmentId={row.id} />
                      ) : null}
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
