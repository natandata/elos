import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { HomeVideos } from "@/components/home/HomeVideos";

export type Highlights = {
  elo: { name: string; points: number } | null;
  devotional: { name: string; avatar_url: string | null; days: number } | null;
  bible: { name: string; avatar_url: string | null; minutes: number } | null;
} | null;

const cap = (s: string) => s.replace(/^\p{L}/u, (c) => c.toUpperCase());

function fmtMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function Tile({ tone, icon, label, children }: { tone: string; icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-3.5 text-[#1d1535]" style={{ background: tone }}>
      <span className="pointer-events-none absolute -right-2 -top-3 text-6xl opacity-20" aria-hidden>
        {icon}
      </span>
      <p className="text-[10px] font-black uppercase tracking-wider text-[#4a3f66]">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** Destaques no topo do Início (Elo nº 1, ofensiva, Bíblia) e, logo abaixo, o card de vídeos do dia. */
export async function HomeHighlights() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("home_highlights");
  return (
    <>
      <HighlightsView h={(data ?? null) as Highlights} />
      <HomeVideos />
    </>
  );
}

export function HighlightsView({ h }: { h: Highlights }) {
  if (!h) return null;

  return (
    <section className="mb-5 overflow-hidden rounded-3xl p-[2px]" style={{ background: "linear-gradient(45deg, #f6d365, #fda085, #f5576c, #b24592, #4f5bd5)" }} aria-label="Destaques do ELOS">
      <div className="rounded-[22px] bg-[var(--card)] px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Destaques do ELOS</p>
          <Link href="/app/biblia" className="text-xs font-bold text-[var(--accent-strong)]">
            📖 Ler a Bíblia
          </Link>
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          <Tile tone="linear-gradient(135deg, #fff3b8, #ffd86b)" icon="🏆" label="Top #01 Elo em pontuação">
            {h.elo ? (
              <>
                <p className="flex items-center gap-2 text-base font-black leading-tight">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f5b301] text-lg" aria-hidden>
                    🏆
                  </span>
                  <span className="min-w-0 break-words">{h.elo.name}</span>
                </p>
                <p className="mt-1 text-sm font-bold text-[#5a4a10]">{Math.floor(h.elo.points).toLocaleString("pt-BR")} pontos</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-[#4a3f66]">Ainda sem pontuação.</p>
            )}
          </Tile>

          <Tile tone="linear-gradient(135deg, #ffd9c7, #ffab91)" icon="🔥" label="Maior ofensiva de devocional">
            {h.devotional ? (
              <>
                <p className="flex items-center gap-2 text-base font-black leading-tight">
                  <Avatar url={h.devotional.avatar_url} name={h.devotional.name} size={36} />
                  <span className="min-w-0 break-words">{cap(h.devotional.name)}</span>
                </p>
                <p className="mt-1 text-sm font-bold text-[#7a2d12]">
                  🔥 {h.devotional.days} {h.devotional.days === 1 ? "dia seguido" : "dias seguidos"}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-[#4a3f66]">Ninguém em ofensiva agora.</p>
            )}
          </Tile>

          <Tile tone="linear-gradient(135deg, #d6e4ff, #a9c1ff)" icon="📖" label="Mais minutos lendo a Bíblia">
            {h.bible ? (
              <>
                <p className="flex items-center gap-2 text-base font-black leading-tight">
                  <Avatar url={h.bible.avatar_url} name={h.bible.name} size={36} />
                  <span className="min-w-0 break-words">{cap(h.bible.name)}</span>
                </p>
                <p className="mt-1 text-sm font-bold text-[#1f3a7a]">📖 {fmtMinutes(h.bible.minutes)} lidos no total</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-[#4a3f66]">Ninguém leu ainda.</p>
            )}
          </Tile>
        </div>
      </div>
    </section>
  );
}
