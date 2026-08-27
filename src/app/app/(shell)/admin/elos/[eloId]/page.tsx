import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  AGE_RANGE_LABEL,
  GENDER_LABEL,
  MISSION_TYPE_LABEL,
  ROLE_LABEL,
  formatDate,
  formatXp,
  type AgeRange,
  type Gender,
  type MissionType,
} from "@/lib/types";

type Participant = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: "leader" | "cria" | "admin";
  approved: boolean;
  xp: number;
};

type MissionRow = {
  id: string;
  title: string;
  type: MissionType;
  xp: number;
  start_date: string | null;
  due_date: string | null;
  creator: { full_name: string } | null;
  mission_assignments: { status: string }[];
};

export default async function EloDetailPage({
  params,
}: {
  params: Promise<{ eloId: string }>;
}) {
  await requireRole("admin");
  const { eloId } = await params;
  const supabase = await createClient();

  const { data: elo } = await supabase
    .from("elos")
    .select("id, name, gender, age_range")
    .eq("id", eloId)
    .maybeSingle<{ id: string; name: string; gender: Gender; age_range: AgeRange }>();

  if (!elo) notFound();

  const [participantsRes, missionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, first_name, last_name, avatar_url, role, approved, xp")
      .eq("elo_id", eloId)
      .order("role")
      .order("full_name"),
    supabase
      .from("missions")
      .select(
        "id, title, type, xp, start_date, due_date, creator:created_by(full_name), mission_assignments(status)",
      )
      .eq("elo_id", eloId)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  const participants = (participantsRes.data ?? []) as Participant[];
  const leaders = participants.filter((p) => p.role === "leader");
  const crias = participants.filter((p) => p.role === "cria");
  const totalXp = crias.reduce((sum, c) => sum + c.xp, 0);

  const missions = (missionsRes.data ?? []) as unknown as MissionRow[];
  const today = new Date().toISOString().slice(0, 10);
  const ongoing = missions.filter((m) => !m.due_date || m.due_date >= today);
  const finished = missions.filter((m) => m.due_date && m.due_date < today);

  const renderParticipant = (p: Participant) => (
    <li key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
      <Avatar url={p.avatar_url} name={p.full_name} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {p.first_name || p.full_name || "Sem nome"} {p.last_name ?? ""}
          {p.role === "leader" && !p.approved ? (
            <span className="ml-2 chip border-amber-200 bg-amber-100 text-amber-800">
              Pendente
            </span>
          ) : null}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {ROLE_LABEL[p.role]}
          {p.role === "cria" ? ` · ${formatXp(p.xp)} XP` : ""}
        </p>
      </div>
    </li>
  );

  const renderMission = (m: MissionRow) => {
    const a = m.mission_assignments ?? [];
    return (
      <li key={m.id} className="rounded-xl border border-[var(--line)] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{m.title}</p>
          <span className="chip bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            {m.xp} XP
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {MISSION_TYPE_LABEL[m.type]} · {m.creator?.full_name ?? "—"} · prazo{" "}
          {formatDate(m.due_date)} · {a.length} participante(s)
        </p>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title={elo.name}
        subtitle={
          <>
            <Link href="/app/admin/elos" className="underline">
              Todos os ELOS
            </Link>{" "}
            · {GENDER_LABEL[elo.gender]} · {AGE_RANGE_LABEL[elo.age_range]}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card className="!p-3 text-center">
          <p className="text-xs text-[var(--muted)]">Crias</p>
          <p className="text-2xl font-bold tabular-nums">{crias.length}</p>
        </Card>
        <Card className="!p-3 text-center">
          <p className="text-xs text-[var(--muted)]">Líderes</p>
          <p className="text-2xl font-bold tabular-nums">{leaders.length}</p>
        </Card>
        <Card className="!p-3 text-center">
          <p className="text-xs text-[var(--muted)]">XP total</p>
          <p className="text-2xl font-bold tabular-nums">{formatXp(totalXp)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
            Liderança
          </h2>
          <Card className="!p-2">
            {leaders.length === 0 ? (
              <p className="p-2 text-sm text-[var(--muted)]">Sem líder aprovado.</p>
            ) : (
              <ul className="space-y-1">{leaders.map(renderParticipant)}</ul>
            )}
          </Card>

          <h2 className="mb-2 mt-4 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
            Crias ({crias.length})
          </h2>
          <Card className="!p-2">
            {crias.length === 0 ? (
              <p className="p-2 text-sm text-[var(--muted)]">Nenhum cria neste Elo ainda.</p>
            ) : (
              <ul className="space-y-1">{crias.map(renderParticipant)}</ul>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
            Missões em curso / agendadas ({ongoing.length})
          </h2>
          {ongoing.length === 0 ? (
            <EmptyState>Nenhuma missão em curso neste Elo.</EmptyState>
          ) : (
            <ul className="space-y-2">{ongoing.map(renderMission)}</ul>
          )}

          {finished.length > 0 ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                Concluídas ({finished.length})
              </summary>
              <ul className="mt-2 space-y-2 opacity-70">{finished.map(renderMission)}</ul>
            </details>
          ) : null}
        </section>
      </div>
    </>
  );
}
