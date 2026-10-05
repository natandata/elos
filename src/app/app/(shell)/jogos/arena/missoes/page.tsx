import Link from "next/link";
import { MissionClaim } from "@/components/arena/MissionClaim";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { loadArenaMissions } from "@/lib/arena/missionsServer";
import { createClient } from "@/lib/supabase/server";

export default async function MissoesArenaPage() {
  const { profile } = await requireRole("cria", "leader");
  const supabase = await createClient();
  const missions = await loadArenaMissions(supabase, profile.id);
  const appMissions = profile.role === "leader" ? "/app/lider/missoes" : "/app/cria/missoes";
  const ready = missions.filter((m) => m.done && !m.claimed).length;
  const gained = missions.filter((m) => m.claimed).reduce((n, m) => n + m.def.reward, 0);

  return (
    <>
      <PageHeader title="🎯 Missões da Arena" subtitle="Missões do jogo, que renovam todo dia e pagam troféus. Cada uma vale até 5 🏆." />
      <p className="mb-4 rounded-2xl bg-sky-500/10 px-4 py-3 text-xs font-semibold text-sky-700">
        Estas são as missões do <b>jogo</b>. As missões do <b>aplicativo</b>, que os líderes passam pra seu crescimento pessoal e espiritual, ficam em{" "}
        <Link href={appMissions} className="font-black underline">
          Missões
        </Link>
        .
      </p>
      <div className="mb-3 flex items-center justify-between text-sm font-black">
        <span>{ready > 0 ? `🎉 ${ready} pra resgatar` : "Complete e resgate os troféus"}</span>
        <span className="text-amber-600">Hoje: +{gained} 🏆</span>
      </div>
      <ul className="space-y-2">
        {missions.map(({ def, progress, done, claimed }) => (
          <li key={def.key} className={`card flex items-center gap-3 p-3 ${claimed ? "opacity-60" : ""}`}>
            <span className="text-3xl" aria-hidden>
              {def.icon}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-sm font-black">{def.title}</span>
              <span className="block text-xs font-semibold text-[var(--muted)]">{def.desc}</span>
              <span className="mt-1.5 flex items-center gap-2">
                <span className="relative h-3 flex-1 overflow-hidden rounded-full bg-black/20">
                  <span className={`block h-full ${done ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${(progress / def.target) * 100}%` }} />
                </span>
                <span className="text-[11px] font-black tabular-nums">
                  {progress}/{def.target}
                </span>
              </span>
            </span>
            {claimed ? (
              <span className="shrink-0 text-sm font-black text-emerald-600">✔ +{def.reward} 🏆</span>
            ) : done ? (
              <MissionClaim missionKey={def.key} reward={def.reward} />
            ) : (
              <span className="shrink-0 rounded-full bg-amber-400/20 px-2.5 py-1 text-sm font-black text-amber-600">+{def.reward} 🏆</span>
            )}
          </li>
        ))}
      </ul>
      <Link href="/app/jogos/arena" className="btn btn-ghost mt-5 w-full">
        ← Voltar à Arena
      </Link>
    </>
  );
}
