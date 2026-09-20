import { Avatar } from "@/components/Avatar";
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
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="text-2xl" aria-hidden>
        👑
      </span>
      <Avatar url={avatarUrl} name={name} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-amber-900">
          {isMe ? "Você é" : name}{" "}
          <span className="font-normal text-amber-800">a cria da semana no seu Elo</span>
        </p>
        <p className="text-xs text-amber-700">+{formatXp(weeklyXp)} XP essa semana</p>
      </div>
    </div>
  );
}
