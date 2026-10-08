import { CATEGORY_LABEL, DIFFICULTY_LABEL, sceneUrl, type BibleTheme } from "@/lib/games/dress/themes";

const DIFF_COLOR: Record<BibleTheme["difficulty"], string> = {
  easy: "bg-emerald-600",
  medium: "bg-amber-500 text-amber-950",
  hard: "bg-orange-600",
  expert: "bg-rose-700",
};

/** Cartão do tema: o cenário da passarela do tema ao fundo, com nome, dificuldade e a chamada da rodada. */
export function ThemeCard({ theme, label = "Tema de hoje", full = false }: { theme: BibleTheme; label?: string; full?: boolean }) {
  return (
    <div className="relative mb-4 overflow-hidden rounded-3xl border-[3px] border-amber-300 shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sceneUrl(theme.scene)} alt="" className={`block w-full object-cover ${full ? "h-[360px] object-[50%_30%]" : "h-[190px] object-[50%_35%]"}`} draggable={false} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1c0b36] via-[#1c0b36]/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
          {label} · {CATEGORY_LABEL[theme.category]}
        </p>
        <h2 className="vh-title mt-1 text-3xl leading-tight">{theme.name}</h2>
        <p className="mt-1 text-sm font-bold text-amber-50 [text-shadow:0_2px_4px_#000]">{theme.description}</p>
        <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-[11px] font-black uppercase tracking-wide text-white ${DIFF_COLOR[theme.difficulty]}`}>{DIFFICULTY_LABEL[theme.difficulty]}</span>
      </div>
    </div>
  );
}
