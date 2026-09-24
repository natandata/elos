import Link from "next/link";
import { SubmitMissionButton } from "@/components/missions/SubmitMissionButton";
import { formatDate } from "@/lib/types";

export type SpotlightMission = {
  assignmentId: string;
  title: string;
  description: string | null;
  xp: number;
  dueDate: string | null;
  totalApproved: number;
  leadingEloId: string | null;
  leadingEloName: string | null;
  leadingEloCount: number;
};

/** Destaque das missões ainda pendentes na Home do cria — mostra quem já fez
 *  e qual Elo está na frente, pra virar competição em vez de só uma lista. */
export function MissionSpotlight({
  missions,
  myEloId,
}: {
  missions: SpotlightMission[];
  myEloId: string | null;
}) {
  if (missions.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
          🔥 Missões pra fazer
        </h2>
        <Link href="/app/cria/missoes" className="text-xs font-semibold text-[var(--accent-strong)]">
          ver todas
        </Link>
      </div>
      <div className="space-y-3">
        {missions.map((m) => {
          const myEloLeading = m.leadingEloId !== null && m.leadingEloId === myEloId;
          return (
            <div key={m.assignmentId} className="card border-2 border-[var(--accent)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{m.title}</p>
                  <p className="text-xs text-[var(--muted)]">prazo {formatDate(m.dueDate)}</p>
                </div>
                <span className="chip shrink-0 bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  {m.xp} XP
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className="chip border-[var(--line)] text-[var(--muted)]">
                  {m.totalApproved > 0
                    ? `${m.totalApproved} já concluíram`
                    : "Ninguém concluiu ainda — seja o primeiro!"}
                </span>
                {m.leadingEloName ? (
                  <span
                    className={`chip font-semibold ${
                      myEloLeading
                        ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                        : "border-amber-200 bg-amber-100 text-amber-800"
                    }`}
                  >
                    🏆 {myEloLeading ? "Seu Elo está na frente" : `${m.leadingEloName} está na frente`} (
                    {m.leadingEloCount})
                  </span>
                ) : null}
              </div>

              {!myEloLeading && m.leadingEloName ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Seu Elo ainda pode virar essa — corre lá!
                </p>
              ) : null}

              <SubmitMissionButton
                assignmentId={m.assignmentId}
                title={m.title}
                description={m.description}
                xp={m.xp}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
