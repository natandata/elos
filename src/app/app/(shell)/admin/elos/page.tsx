import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGE_RANGE_LABEL, GENDER_LABEL, formatXp, type AgeRange, type Gender } from "@/lib/types";

type EloRow = {
  id: string;
  name: string;
  gender: Gender;
  age_range: AgeRange;
  profiles: { id: string; full_name: string; role: string; xp: number }[];
};

export default async function ElosPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("elos")
    .select("id, name, gender, age_range, profiles:profiles(id, full_name, role, xp)")
    .order("gender")
    .order("age_range");

  const elos = (data ?? []) as unknown as EloRow[];

  const ranked = elos
    .map((e) => {
      const crias = e.profiles.filter((p) => p.role === "cria");
      return {
        ...e,
        crias,
        leaders: e.profiles.filter((p) => p.role === "leader"),
        totalXp: crias.reduce((sum, c) => sum + c.xp, 0),
      };
    })
    .sort((a, b) => b.totalXp - a.totalXp);

  const positionOf = new Map(ranked.map((e, i) => [e.id, i + 1]));

  return (
    <>
      <PageHeader title="ELOS" subtitle="Estrutura, liderança e XP de cada Elo." />

      {error ? (
        <EmptyState>Não foi possível carregar os ELOS.</EmptyState>
      ) : elos.length === 0 ? (
        <EmptyState>Nenhum Elo cadastrado. Rode o seed do banco.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ranked.map((elo) => (
            <Card key={elo.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{elo.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {GENDER_LABEL[elo.gender]} · {AGE_RANGE_LABEL[elo.age_range]}
                  </p>
                </div>
                <span className="chip bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  {positionOf.get(elo.id)}º · {formatXp(elo.totalXp)} XP
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-[var(--muted)]">Líder responsável</dt>
                  <dd className="font-semibold">
                    {elo.leaders.length
                      ? elo.leaders.map((l) => l.full_name || "Sem nome").join(", ")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Crias</dt>
                  <dd className="font-semibold">{elo.crias.length}</dd>
                </div>
              </dl>

              <Link
                href={`/app/admin/usuarios?elo=${elo.id}`}
                className="btn btn-ghost mt-4 w-full !py-2 !text-sm"
              >
                Ver participantes
              </Link>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
