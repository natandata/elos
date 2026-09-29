import { Card, Chip, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LeaderCareControls } from "@/components/care/LeaderCareControls";
import {
  formatDateTime,
  hasBadStatus,
  relativeDay,
  STATUS_LABEL,
  STATUS_TONE,
  type CareMeeting,
  type StatusLevel,
} from "@/lib/types";

export default async function StatusEquipePage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: leaders, error } = await supabase
    .from("profiles")
    .select("id, full_name, elos:elo_id(name)")
    .eq("role", "leader")
    .eq("approved", true)
    .order("full_name");

  const leaderList = (leaders ?? []) as unknown as {
    id: string;
    full_name: string;
    elos: { name: string } | null;
  }[];

  const leaderIds = leaderList.length ? leaderList.map((l) => l.id) : ["-"];

  const [{ data: history }, { data: followUps }, { data: meetings }] = await Promise.all([
    supabase
      .from("status_responses")
      .select("id, user_id, emotional_status, spiritual_status, created_at")
      .in("user_id", leaderIds)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("status_follow_ups").select("status_response_id, note, resolved_by"),
    supabase
      .from("care_meetings")
      .select("*")
      .in("cria_id", leaderIds)
      .eq("status", "pending_leader")
      .order("created_at", { ascending: false }),
  ]);

  const responses = (history ?? []) as {
    id: string;
    user_id: string;
    emotional_status: StatusLevel;
    spiritual_status: StatusLevel;
    created_at: string;
  }[];

  const latest = new Map<string, (typeof responses)[number]>();
  responses.forEach((r) => {
    if (!latest.has(r.user_id)) latest.set(r.user_id, r);
  });

  const followUpRows = (followUps ?? []) as {
    status_response_id: string;
    note: string;
    resolved_by: string | null;
  }[];
  const followUpByResponse = new Map(followUpRows.map((f) => [f.status_response_id, f.note]));

  // Nome de quem tratou — via RPC porque quem resolveu pode não ser admin
  // (mesmo padrão de status-crias.tsx).
  const { data: resolverRows } = followUpRows.length
    ? await supabase.rpc("status_follow_up_resolver_names", {
        p_status_response_ids: followUpRows.map((f) => f.status_response_id),
      })
    : { data: [] };
  const resolverNameByResponse = new Map(
    ((resolverRows ?? []) as { status_response_id: string; resolver_name: string }[]).map((r) => [
      r.status_response_id,
      r.resolver_name,
    ]),
  );

  const pendingMeetingByLeader = new Map<string, CareMeeting>();
  ((meetings ?? []) as CareMeeting[]).forEach((m) => {
    if (!pendingMeetingByLeader.has(m.cria_id)) pendingMeetingByLeader.set(m.cria_id, m);
  });

  return (
    <>
      <PageHeader
        title="Status Equipe"
        subtitle="Acompanhamento emocional e espiritual dos líderes."
      />

      {error ? (
        <EmptyState>Não foi possível carregar os líderes.</EmptyState>
      ) : leaderList.length === 0 ? (
        <EmptyState>Nenhum líder cadastrado ainda. Promova um usuário em Usuários.</EmptyState>
      ) : (
        <div className="space-y-3">
          {leaderList.map((leader) => {
            const current = latest.get(leader.id);
            const past = responses.filter((r) => r.user_id === leader.id).slice(1, 5);
            const bad = hasBadStatus(current);

            return (
              <Card key={leader.id} className={bad ? "border-2 border-red-600 ring-2 ring-red-200" : ""}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {bad ? <span aria-hidden>🚨 </span> : null}
                      {leader.full_name || "Sem nome"}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {leader.elos?.name ?? "Sem Elo"} · Atualizado{" "}
                      {relativeDay(current?.created_at ?? null).toLowerCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {current ? (
                      <>
                        <Chip className={STATUS_TONE[current.emotional_status]}>
                          Emocional: {STATUS_LABEL[current.emotional_status]}
                        </Chip>
                        <Chip className={STATUS_TONE[current.spiritual_status]}>
                          Espiritual: {STATUS_LABEL[current.spiritual_status]}
                        </Chip>
                      </>
                    ) : (
                      <Chip className="border-[var(--line)] text-[var(--muted)]">
                        Sem resposta
                      </Chip>
                    )}
                  </div>
                </div>

                {past.length > 0 ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">
                      Histórico ({past.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                      {past.map((r) => (
                        <li key={r.id}>
                          {formatDateTime(r.created_at)} — emocional{" "}
                          {STATUS_LABEL[r.emotional_status].toLowerCase()}, espiritual{" "}
                          {STATUS_LABEL[r.spiritual_status].toLowerCase()}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                {bad && current ? (
                  <LeaderCareControls
                    statusResponseId={current.id}
                    alreadyResolvedNote={followUpByResponse.get(current.id) ?? null}
                    resolvedByName={resolverNameByResponse.get(current.id) ?? null}
                    pendingMeeting={pendingMeetingByLeader.get(leader.id) ?? null}
                  />
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
