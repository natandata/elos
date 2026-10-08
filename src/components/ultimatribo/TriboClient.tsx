"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { finishTriboMatch } from "@/lib/actions/tribo";
import { LORE, LORE_BY_ID, LORE_ICON } from "@/lib/ultimatribo/data/lore";
import { OUTFITS, levelOf, matchXp, titleOf, type TriboStats } from "@/lib/ultimatribo/progress";
import type { MatchStats } from "@/lib/ultimatribo/sim";

/** O jogo usa WebGL e o tamanho da tela: só existe no navegador. */
const TriboGame = dynamic(() => import("./TriboGame").then((m) => m.TriboGame), {
  ssr: false,
  loading: () => <p className="fixed inset-0 z-[70] grid place-items-center bg-black text-sm font-black text-white">Carregando o mapa…</p>,
});

const hexCss = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function TriboClient({ name, initial }: { name: string; initial: TriboStats }) {
  const [stats, setStats] = useState(initial);
  const [seed, setSeed] = useState<number | null>(null);
  const [result, setResult] = useState<{ m: MatchStats; xp: number; saved: boolean; error?: string } | null>(null);
  const [outfit, setOutfit] = useState(0);
  const [diary, setDiary] = useState(false);

  const lv = levelOf(stats.xp);
  const color = OUTFITS[outfit]?.color ?? OUTFITS[0].color;

  async function end(m: MatchStats) {
    setSeed(null);
    const xp = matchXp(m);
    setResult({ m, xp, saved: false });
    const r = await finishTriboMatch(m).catch(() => ({ error: "Sem conexão: o progresso desta partida não foi salvo." }) as { error?: string; xp?: number; total?: number });
    if (r.error || r.total === undefined) return setResult({ m, xp: r.xp ?? 0, saved: false, error: r.error });
    setStats((s) => ({ ...s, xp: r.total!, matches: s.matches + 1, wins: s.wins + (m.won ? 1 : 0), kills: s.kills + m.kills, best_place: s.best_place ? Math.min(s.best_place, m.place) : m.place, lore: [...new Set([...s.lore, ...m.lore])] }));
    setResult({ m, xp: r.xp ?? xp, saved: true });
  }

  if (seed !== null) return <TriboGame seed={seed} name={name} color={color} onEnd={end} onQuit={() => setSeed(null)} />;

  return (
    <div className="mx-auto max-w-xl overflow-hidden rounded-3xl bg-[#14110d] text-stone-100 shadow-2xl ring-2 ring-[#5a4a2a]">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ultimatribo/capa.webp" alt="A Última Tribo: o arrebatamento aconteceu, você ficou. Agora, sobreviva." className="block w-full" draggable={false} />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#14110d] to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-rose-700 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Em construção · oculto</span>
      </div>

      <div className="space-y-4 p-4">
        {result ? (
          <section className="rounded-2xl border-2 border-amber-600/60 bg-black/40 p-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">{result.m.won ? "Você é a última tribo" : "Fim da linha"}</p>
            <p className="mt-1 text-4xl font-black text-amber-100">
              {result.m.place}º <span className="text-lg text-stone-400">de {result.m.players}</span>
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              {[
                ["☠️", result.m.kills, "eliminações"],
                ["⏱", clock(result.m.seconds), "vivo"],
                ["📦", result.m.opened, "caixas"],
                ["📜", result.m.lore.length, "achados"],
              ].map(([i, v, l]) => (
                <div key={String(l)} className="rounded-xl bg-white/5 p-2">
                  <p className="text-lg font-black">
                    {i} {v}
                  </p>
                  <p className="text-[10px] text-stone-400">{l}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-lg font-black text-emerald-300">+{result.xp} XP</p>
            {result.error ? <p className="mt-1 text-xs font-bold text-rose-300">{result.error}</p> : !result.saved ? <p className="mt-1 text-xs text-stone-400">Salvando…</p> : null}
            <button type="button" onClick={() => setResult(null)} className="mt-3 w-full rounded-full bg-amber-600 py-2.5 text-sm font-black uppercase tracking-wide text-black active:scale-[0.98]">
              Continuar
            </button>
          </section>
        ) : null}

        <section className="rounded-2xl bg-white/5 p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-black">
              Nível {lv.level} · <span className="text-amber-300">{titleOf(lv.level)}</span>
            </p>
            <p className="text-[11px] tabular-nums text-stone-400">
              {lv.into}/{lv.next} XP
            </p>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/60">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${(lv.into / lv.next) * 100}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-stone-400">
            {stats.matches} partida(s) · {stats.wins} vitória(s) · {stats.kills} eliminação(ões){stats.best_place ? ` · melhor: ${stats.best_place}º` : ""}
          </p>
        </section>

        <section className="rounded-2xl border-2 border-amber-700/60 bg-gradient-to-b from-[#2a2114] to-[#17130c] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Modo 1 · PvP</p>
          <h2 className="text-2xl font-black tracking-wide">SOBREVIVÊNCIA</h2>
          <p className="mt-1 text-sm text-stone-300">Dez sobreviventes, um mapa, e as Trevas fechando o cerco. Ache comida, água e armas, forme uma tribo de até 3 e decida em quem confiar. Só um vence.</p>
          <button type="button" onClick={() => setSeed((Date.now() ^ (Math.random() * 1e9)) >>> 0)} className="mt-3 w-full rounded-full bg-amber-500 py-3 text-base font-black uppercase tracking-wide text-black shadow-[0_4px_0_#7a4a08] active:translate-y-[3px] active:shadow-none">
            Jogar sozinho · 9 sobreviventes do computador
          </button>
          <p className="mt-2 text-center text-[11px] text-stone-400">Salas ao vivo de 5 a 10 jogadores: próxima etapa.</p>
        </section>

        <section className="rounded-2xl border-2 border-stone-700 bg-black/30 p-4 opacity-70">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Modo 2 · PvE</p>
          <h2 className="text-2xl font-black tracking-wide">INFESTAÇÃO</h2>
          <p className="mt-1 text-sm text-stone-300">Sobreviva junto contra as hordas: uma onda a cada 5 minutos, com uma missão em cada onda.</p>
          <p className="mt-2 rounded-full bg-stone-800 py-2 text-center text-xs font-black uppercase tracking-wide text-stone-400">Em desenvolvimento</p>
        </section>

        <section className="rounded-2xl bg-white/5 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-stone-300">Roupa</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OUTFITS.map((o, i) => {
              const open = lv.level >= o.level;
              return (
                <button key={o.name} type="button" disabled={!open} onClick={() => setOutfit(i)} title={open ? o.name : `Nível ${o.level}`} className={`relative h-10 w-10 rounded-full border-[3px] ${outfit === i ? "border-amber-300" : "border-white/25"} disabled:opacity-40`} style={{ background: hexCss(o.color) }}>
                  {open ? null : <span className="absolute inset-0 grid place-items-center text-[10px] font-black text-white">🔒{o.level}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white/5 p-3">
          <button type="button" onClick={() => setDiary((d) => !d)} className="flex w-full items-center justify-between text-left">
            <span className="text-xs font-black uppercase tracking-wide text-stone-300">
              📔 Diário · {stats.lore.length}/{LORE.length} achados
            </span>
            <span className="text-stone-400">{diary ? "▲" : "▼"}</span>
          </button>
          {diary ? (
            stats.lore.length === 0 ? (
              <p className="mt-2 text-xs text-stone-400">Pergaminhos, Bíblias e mensagens que você encontrar no mapa ficam guardados aqui.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {stats.lore.map((id) => {
                  const l = LORE_BY_ID.get(id);
                  return l ? (
                    <li key={id} className="rounded-xl bg-black/40 p-2.5">
                      <p className="text-[10px] font-black uppercase tracking-wide text-amber-400">
                        {LORE_ICON[l.kind]} {l.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-snug text-stone-200">{l.text}</p>
                      {l.ref ? <p className="mt-0.5 text-[11px] font-black text-amber-300">{l.ref}</p> : null}
                    </li>
                  ) : null;
                })}
              </ul>
            )
          ) : null}
        </section>

        <section className="rounded-2xl bg-white/5 p-3 text-xs leading-relaxed text-stone-300">
          <p className="font-black uppercase tracking-wide text-stone-200">Como jogar</p>
          <p className="mt-1">
            <b>Celular:</b> lado esquerdo anda (empurre até o fim para correr), lado direito olha, 🎯 atira ou bate.
          </p>
          <p>
            <b>Computador:</b> WASD, mouse, clique atira, Shift corre, E age, R recarrega, 1 2 3 trocam de arma, Z X C comem, bebem e curam.
          </p>
          <p className="mt-1">Fome e sede baixam o tempo todo. Chegue perto de outro sobrevivente para propor aliança; ferir um aliado é traição.</p>
        </section>

        <Link href="/app/jogos" className="block rounded-full bg-stone-800 py-2.5 text-center text-sm font-black text-stone-200">
          ← Voltar aos jogos
        </Link>
      </div>
    </div>
  );
}
