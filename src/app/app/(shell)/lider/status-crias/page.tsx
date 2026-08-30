import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusHistoryChart } from "@/components/StatusHistoryChart";
import { LeaderCareControls } from "@/components/care/LeaderCareControls";
import {
  STATUS_LABEL,
  STATUS_TONE,
  formatDateTime,
  hasBadStatus,
  hasConcerningStatus,
  relativeDay,
  type AgeRange,
  type CareMeeting,
  type CriaProfileDetails,
  type Gender,
  type StatusLevel,
} from "@/lib/types";

type Search = { elo?: string; status?: string };

export default async function StatusCriasPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { profile } = await requireRole("leader", "admin");
  const supabase = await createClient();
  const isAdmin = profile.role === "admin";
  const sp = await searchParams;

  // Líder só vê os crias sob sua responsabilidade (leader_crias); admin vê
  // todo mundo, de todos os ELOS — com filtro por Elo e por nível de status.
  const criasQuery = isAdmin
    ? supabase.from("profiles").select("id, full_name, elo_id").eq("role", "cria")
    : supabase
        .from("leader_crias")
        .select("profiles:cria_id(id, full_name, elo_id)")
        .eq("leader_id", profile.id);
  const [{ data: links }, elosRes] = await Promise.all([
    criasQuery,
    isAdmin
      ? supabase.from("elos").select("id, name, gender, age_range").order("gender").order("age_range")
      : Promise.resolve({ data: [] }),
  ]);

  const elos = (elosRes.data ?? []) as { id: string; name: string; gender: Gender; age_range: AgeRange }[];

  let crias = isAdmin
    ? ((links ?? []) as { id: string; full_name: string; elo_id: string | null }[]).sort((a, b) =>
        a.full_name.localeCompare(b.full_name),
      )
    : ((links ?? []) as unknown as { profiles: { id: string; full_name: string; elo_id: string | null } | null }[])
        .map((r) => r.profiles)
        .filter((p): p is { id: string; full_name: string; elo_id: string | null } => Boolean(p))
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

  if (isAdmin && sp.elo) crias = crias.filter((c) => c.elo_id === sp.elo);

  const ids = crias.length ? crias.map((c) => c.id) : ["00000000-0000-0000-0000-000000000000"];

  const [historyRes, followUpsRes, meetingsRes, detailsRes] = await Promise.all([
    supabase
      .from("status_responses")
      .select("id, user_id, emotional_status, spiritual_status, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("status_follow_ups").select("status_response_id, note"),
    supabase
      .from("care_meetings")
      .select("*")
      .in("cria_id", ids)
      .order("created_at", { ascending: false }),
    supabase.from("cria_profile_details").select("*").in("id", ids),
  ]);

  const responses = (historyRes.data ?? []) as {
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

  if (isAdmin && sp.status) {
    crias = crias.filter((c) => {
      const s = latest.get(c.id);
      if (sp.status === "none") return !s;
      return s?.emotional_status === sp.status || s?.spiritual_status === sp.status;
    });
  }

  const followUpByResponse = new Map(
    ((followUpsRes.data ?? []) as { status_response_id: string; note: string }[]).map((f) => [
      f.status_response_id,
      f.note,
    ]),
  );

  const meetings = (meetingsRes.data ?? []) as CareMeeting[];
  const pendingMeetingByCria = new Map<string, CareMeeting>();
  meetings
    .filter((m) => m.status === "pending_leader")
    .forEach((m) => {
      if (!pendingMeetingByCria.has(m.cria_id)) pendingMeetingByCria.set(m.cria_id, m);
    });

  const detailsByCria = new Map(
    ((detailsRes.data ?? []) as CriaProfileDetails[]).map((d) => [d.id, d]),
  );

  const isUnresolvedBad = (criaId: string) => {
    const s = latest.get(criaId);
    return hasBadStatus(s) && !followUpByResponse.has(s!.id);
  };
  const badCount = crias.filter((c) => isUnresolvedBad(c.id)).length;
  // "ok" (mais ou menos) também precisa aparecer pro líder, só que sem o alarme
  // vermelho reservado pro "Mal" — badCount continua contando só o urgente.
  const concerningCount = crias.filter(
    (c) => hasConcerningStatus(latest.get(c.id)) && !hasBadStatus(latest.get(c.id)),
  ).length;
  const sortedCrias = [...crias].sort(
    (a, b) =>
      Number(hasConcerningStatus(latest.get(b.id))) - Number(hasConcerningStatus(latest.get(a.id))) ||
      Number(hasBadStatus(latest.get(b.id))) - Number(hasBadStatus(latest.get(a.id))),
  );

  return (
    <>
      <PageHeader
        title="Status Crias"
        subtitle={
          isAdmin
            ? "Como estão emocional e espiritualmente todos os crias da plataforma."
            : "Como estão emocional e espiritualmente os crias sob sua responsabilidade."
        }
      />

      {isAdmin ? (
        <form className="mb-4 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="elo">
              Elo
            </label>
            <select id="elo" name="elo" className="input" defaultValue={sp.elo ?? ""}>
              <option value="">Todos os ELOS</option>
              {elos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">
              Status (emocional ou espiritual)
            </label>
            <select id="status" name="status" className="input" defaultValue={sp.status ?? ""}>
              <option value="">Todos</option>
              <option value="bad">Mal</option>
              <option value="ok">Mais ou menos</option>
              <option value="good">Bem</option>
              <option value="none">Sem resposta ainda</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full !py-2 !text-sm">Filtrar</button>
          </div>
        </form>
      ) : null}

      {badCount > 0 ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-red-700 bg-red-600 px-4 py-3 text-white shadow-lg shadow-red-600/20">
          <span className="text-2xl" aria-hidden>
            🚨
          </span>
          <span className="font-black">
            {badCount === 1
              ? "1 cria respondeu \"Mal\" no status — precisa de atenção agora."
              : `${badCount} crias responderam "Mal" no status — precisam de atenção agora.`}
          </span>
        </div>
      ) : null}

      {concerningCount > 0 ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-amber-900">
          <span className="text-2xl" aria-hidden>
            ⚠️
          </span>
          <span className="font-bold">
            {concerningCount === 1
              ? "1 cria respondeu \"Mais ou menos\" no status — vale dar uma olhada."
              : `${concerningCount} crias responderam "Mais ou menos" no status — vale dar uma olhada.`}
          </span>
        </div>
      ) : null}

      {crias.length === 0 ? (
        <EmptyState>
          {isAdmin
            ? "Nenhum cria cadastrado ainda."
            : "Nenhum cria vinculado a você ainda. A administração faz esse vínculo em Usuários."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {sortedCrias.map((cria) => {
            const current = latest.get(cria.id);
            const chartHistory = responses.filter((r) => r.user_id === cria.id).slice(0, 12);
            const past = chartHistory.slice(1, 5);
            const bad = hasBadStatus(current);
            const concerning = !bad && hasConcerningStatus(current);
            const details = detailsByCria.get(cria.id);

            return (
              <Card
                key={cria.id}
                className={
                  bad
                    ? "border-2 border-red-600 ring-2 ring-red-200"
                    : concerning
                      ? "border-2 border-amber-400 ring-2 ring-amber-100"
                      : ""
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {bad ? <span aria-hidden>🚨 </span> : concerning ? <span aria-hidden>⚠️ </span> : null}
                      {cria.full_name || "Sem nome"}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Atualizado {relativeDay(current?.created_at ?? null).toLowerCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {current ? (
                      <>
                        <span className={`chip ${STATUS_TONE[current.emotional_status]}`}>
                          Emocional: {STATUS_LABEL[current.emotional_status]}
                        </span>
                        <span className={`chip ${STATUS_TONE[current.spiritual_status]}`}>
                          Espiritual: {STATUS_LABEL[current.spiritual_status]}
                        </span>
                      </>
                    ) : (
                      <span className="chip border-[var(--line)] text-[var(--muted)]">
                        Sem resposta
                      </span>
                    )}
                  </div>
                </div>

                {chartHistory.length >= 2 ? (
                  <StatusHistoryChart history={chartHistory} />
                ) : null}

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

                {details && (details.guardian_name || details.guardian_phone || details.notes) ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">
                      Ficha do cria
                    </summary>
                    <div className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                      {details.guardian_name ? <p>Responsável: {details.guardian_name}</p> : null}
                      {details.guardian_phone ? <p>Telefone: {details.guardian_phone}</p> : null}
                      {details.guardian_relationship ? <p>Parentesco: {details.guardian_relationship}</p> : null}
                      {details.notes ? <p>Observações: {details.notes}</p> : null}
                    </div>
                  </details>
                ) : null}

                {bad && current ? (
                  <LeaderCareControls
                    statusResponseId={current.id}
                    alreadyResolvedNote={followUpByResponse.get(current.id) ?? null}
                    pendingMeeting={pendingMeetingByCria.get(cria.id) ?? null}
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
