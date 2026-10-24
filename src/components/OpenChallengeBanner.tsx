import { GradientCard } from "@/components/home/GradientCard";

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
    <GradientCard tone="gold" title="Desafio entre os Elos">
      <p className="flex items-center gap-2 text-base font-black">
        <span className="text-xl" aria-hidden>
          🏆
        </span>{" "}
        {title}
      </p>
      {description ? <p className="mt-1.5 text-sm font-semibold text-[var(--muted)]">{description}</p> : null}
      {bonusXp > 0 ? (
        <p className="mt-1.5 text-sm font-bold text-[var(--accent-strong)]">+{bonusXp} XP pra cada cria do Elo vencedor</p>
      ) : null}
    </GradientCard>
  );
}
