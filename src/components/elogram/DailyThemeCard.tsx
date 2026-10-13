import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { DailyTheme } from "@/lib/feedPrompts";

export type ThemePair = {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  myPosted: boolean;
  partnerPosted: boolean;
};

/** Card do "Tema do dia": degradê vivo, emoji grande e confete. Nos dias de dupla mostra a parceira/o parceiro e o andamento. */
export function DailyThemeCard({ theme, streak, pair }: { theme: DailyTheme; streak: number; pair?: ThemePair | null }) {
  const done = !!pair && pair.myPosted && pair.partnerPosted;
  const waitingPartner = !!pair && pair.myPosted && !pair.partnerPosted;
  const partnerFirst = !!pair && !pair.myPosted && pair.partnerPosted;

  return (
    <div className="relative mx-3 mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-[2px] shadow-lg">
      <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-br from-violet-700/95 via-fuchsia-600/95 to-orange-500/95 px-4 py-3.5 text-white">
        {/* confete decorativo */}
        <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/15" />
        <span aria-hidden className="pointer-events-none absolute -bottom-6 right-10 h-14 w-14 rounded-full bg-white/10" />
        <span aria-hidden className="pointer-events-none absolute right-4 top-2 text-sm opacity-80">✨</span>
        <span aria-hidden className="pointer-events-none absolute bottom-2 right-16 text-xs opacity-70">⭐</span>

        <div className="relative flex items-center gap-3.5">
          <span
            aria-hidden
            className="grid h-16 w-16 shrink-0 -rotate-6 place-items-center rounded-2xl bg-white/95 text-4xl shadow-[0_4px_0_rgba(0,0,0,0.22)]"
          >
            {theme.emoji}
          </span>

          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/90">
              {pair ? "Tema em dupla" : "Tema do dia"}
              <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black tracking-normal text-yellow-950">
                +1 XP
              </span>
            </p>
            <p className="mt-1 text-[17px] font-extrabold leading-snug [text-shadow:0_1px_0_rgba(0,0,0,0.2)]">{theme.text}</p>
            {!pair && streak > 0 ? (
              <p className="mt-1.5 inline-block rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-bold">
                🔥 {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}
              </p>
            ) : null}
          </div>
        </div>

        {pair ? (
          <div className="relative mt-3 rounded-xl bg-black/25 p-2.5">
            <div className="flex items-center gap-2.5">
              <Link href={`/app/elogram/perfil/${pair.partnerId}`} className="shrink-0">
                <Avatar url={pair.partnerAvatar} name={pair.partnerName} size={36} />
              </Link>
              <p className="min-w-0 flex-1 text-sm font-bold leading-snug">
                {done ? (
                  <>✅ Dupla completa com {pair.partnerName}! Vocês dois ganharam +1 XP.</>
                ) : waitingPartner ? (
                  <>
                    ⏳ Você já postou! Falta {pair.partnerName} postar.{" "}
                    <span className="font-semibold">Chame a sua dupla: vocês só ganham o +1 XP quando os dois postarem.</span>
                  </>
                ) : partnerFirst ? (
                  <>{pair.partnerName} já postou o tema! Poste o seu agora para vocês dois ganharem +1 XP.</>
                ) : (
                  <>👯 Sua dupla de hoje é {pair.partnerName}. Os dois precisam postar o tema para ganhar +1 XP.</>
                )}
              </p>
            </div>
            {waitingPartner ? (
              <Link
                href={`/app/elogram/mensagens/com/${pair.partnerId}`}
                className="mt-2 block rounded-lg bg-yellow-300 py-2 text-center text-sm font-black text-yellow-950 shadow-[0_3px_0_rgba(0,0,0,0.25)] active:translate-y-[2px] active:shadow-none"
              >
                📣 Chamar {pair.partnerName} para postar
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
