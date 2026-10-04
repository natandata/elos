/** Meta coletiva da semana: todo o Elo empurra a mesma barra (XP somado de todos). */
export function EloWeeklyGoal({ xp, goal, eloName }: { xp: number; goal: number; eloName: string }) {
  const pct = Math.min(100, Math.round((xp / goal) * 100));
  const reached = xp >= goal;
  return (
    <div className="mb-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-5 py-4 text-emerald-900">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base font-black">
          <span aria-hidden>🎯</span> Meta da semana do {eloName}
        </p>
        <p className="text-sm font-bold tabular-nums">
          {xp}/{goal} XP
        </p>
      </div>
      <div className="mt-2 h-4 overflow-hidden rounded-full bg-emerald-200">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm font-bold">
        {reached ? "🎉 Meta batida! O Elo todo está de parabéns." : `Faltam ${goal - xp} XP — jogue, faça devocional e poste pra ajudar!`}
      </p>
    </div>
  );
}
