import { Avatar } from "@/components/Avatar";
import { GradientCard } from "@/components/home/GradientCard";
import { formatXp } from "@/lib/types";

/**
 * Destaque de quem mais ganhou XP nesta semana no Elo (weekly_xp_ranking,
 * reseta toda semana) — dá motivo de olhar todo dia pra ver se é você ou um
 * amigo que está na frente. Não aparece se ninguém pontuou ainda essa semana.
 */
export function CriaDaSemana({
  name,
  avatarUrl,
  weeklyXp,
  isMe,
}: {
  name: string;
  avatarUrl: string | null;
  weeklyXp: number;
  isMe: boolean;
}) {
  return (
    <GradientCard tone="gold" ariaLabel="Cria da semana">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          👑
        </span>
        <Avatar url={avatarUrl} name={name} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-base font-black leading-snug">
            {isMe ? "Você é" : name} <span className="font-semibold text-[var(--muted)]">a cria da semana no seu Elo</span>
          </p>
          <p className="text-sm font-bold text-[var(--accent-strong)]">+{formatXp(weeklyXp)} XP essa semana</p>
        </div>
      </div>
    </GradientCard>
  );
}
