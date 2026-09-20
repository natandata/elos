export function OpenChallengeBanner({
  title,
  description,
  bonusXp,
}: {
  title: string;
  description: string | null;
  bonusXp: number;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
        <span aria-hidden>🏆</span> Desafio entre os Elos: {title}
      </p>
      {description ? <p className="mt-1 text-sm text-amber-800">{description}</p> : null}
      {bonusXp > 0 ? (
        <p className="mt-1 text-xs font-semibold text-amber-700">
          +{bonusXp} XP pra cada cria do Elo vencedor
        </p>
      ) : null}
    </div>
  );
}
