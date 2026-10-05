"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { ARENAS, TROPHY_LOSS, TROPHY_WIN, arenaProgress } from "@/lib/arena/arenas";
import { ArenaHero } from "./ArenaHero";
import { ArenaGateBanner } from "./ArenaGateBanner";
import type { GateInfo } from "@/lib/arena/gate";

export type RankRow = { id: string; name: string; avatar: string | null; elo: string | null; trophies: number };
export type EloRow = { id: string; name: string; points: number };
export type ArenaTab = "battle" | "cards" | "chests" | "ranking" | "info";

const MIN_RANK_TROPHIES = 30;

function MiniBtn({ children, label, badge, onClick, href }: { children: ReactNode; label: string; badge?: number; onClick?: () => void; href?: string }) {
  const cls = "cr-panel relative flex h-12 w-12 items-center justify-center text-2xl active:translate-y-[2px]";
  const inner = (
    <>
      <span aria-hidden>{children}</span>
      {badge ? <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[11px] font-black text-white">{badge}</span> : null}
    </>
  );
  return href ? (
    <Link href={href} aria-label={label} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Slot({ icon, iconSrc, title, sub, open, href, onClick }: { icon: string; iconSrc?: string; title: string; sub: string; open?: boolean; href?: string; onClick?: () => void }) {
  const body = (
    <div className={`cr-slot ${open ? "cr-slot-open" : ""} flex h-full flex-col items-center justify-between px-1 py-1.5 text-center`}>
      <p className="cr-text text-[10px] leading-none">{title}</p>
      {iconSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconSrc} alt="" className="h-9 w-auto drop-shadow" draggable={false} />
      ) : (
        <span className="text-3xl leading-none drop-shadow" aria-hidden>
          {icon}
        </span>
      )}
      <p className="cr-text text-[11px] leading-none">{sub}</p>
    </div>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="block h-[92px] w-full active:translate-y-[2px]">
      {body}
    </button>
  ) : href ? (
    <Link href={href} className="block h-[92px]">
      {body}
    </Link>
  ) : (
    <div className="h-[92px]">{body}</div>
  );
}

export function ArenaHome({
  tab,
  setTab,
  trophies,
  dailyChestReady,
  chests,
  winsToday,
  maxWins,
  eloRanking,
  myEloId,
  trophyRanking,
  myId,
  missionsHref,
  invites,
  onBattle,
  error,
  cards,
  gate,
}: {
  tab: ArenaTab;
  setTab: (t: ArenaTab) => void;
  trophies: number;
  dailyChestReady: boolean;
  chests: ReactNode;
  winsToday: number;
  maxWins: number;
  eloRanking: EloRow[];
  myEloId: string | null;
  trophyRanking: RankRow[];
  myId: string;
  missionsHref: string;
  invites: number;
  onBattle: () => void;
  error: string | null;
  cards: ReactNode;
  gate: GateInfo;
}) {
  const prog = arenaProgress(trophies);
  const [rankTab, setRankTab] = useState<"players" | "elos">("players");
  const myEloIdx = eloRanking.findIndex((r) => r.id === myEloId);
  const myElo = myEloIdx >= 0 ? eloRanking[myEloIdx] : null;
  const me = trophyRanking.findIndex((r) => r.id === myId);

  const tabs: { key: ArenaTab; icon: string; label: string }[] = [
    { key: "cards", icon: "🃏", label: "Cartas" },
    { key: "chests", icon: "🎁", label: "Baús" },
    { key: "battle", icon: "⚔️", label: "Batalha" },
    { key: "ranking", icon: "🏆", label: "Ranking" },
    { key: "info", icon: "📜", label: "Regras" },
  ];

  return (
    <div className="cr-pattern mx-auto w-full max-w-[480px] overflow-hidden rounded-[26px] border-[3px] border-[#0b2a5c] shadow-2xl">
      <div className="min-h-[650px] px-3 pb-4 pt-3">
        {tab === "battle" ? (
          <>
            {/* atalhos de cima */}
            <div className="grid grid-cols-2 gap-2">
              <Link href={missionsHref} className="cr-panel flex min-w-0 items-center gap-1.5 px-2 py-2 active:translate-y-[2px]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#1c4f9a] text-lg shadow-inner" aria-hidden>
                  🎯
                </span>
                <span className="cr-text min-w-0 text-[15px] leading-tight">Missões</span>
              </Link>
              <Link href="/app/jogos" className="cr-panel flex min-w-0 items-center gap-1 px-2 py-2 active:translate-y-[2px]">
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="cr-text block text-[12px] text-[#9be8ff]">Baú do Dia</span>
                  <span className="cr-text block truncate text-[12px]">Jogos</span>
                </span>
                <span className="shrink-0 text-3xl drop-shadow" aria-hidden>
                  🎁
                </span>
              </Link>
            </div>

            {/* faixa do torneio Elo vs Elo */}
            <button
              type="button"
              onClick={() => {
                setRankTab("elos");
                setTab("ranking");
              }}
              className="mt-2 flex w-full items-center gap-2 overflow-hidden rounded-lg border-[3px] border-[#123a73] px-2 py-1.5 text-left shadow-[0_3px_0_#0c2a58]"
              style={{ background: "linear-gradient(90deg, #35507f 0%, #2b6a3a 55%, #3d8b3a 100%)" }}
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-[#f5c542] bg-gradient-to-b from-[#9b5de5] to-[#5a2ea6]">
                <span className="cr-text text-sm">#{myEloIdx >= 0 ? myEloIdx + 1 : "–"}</span>
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="cr-text block truncate text-[15px]">Torneio Elo vs Elo</span>
                <span className="cr-text block truncate text-[11px] opacity-90">{myElo ? `${myElo.name} · ${myElo.points} pts na semana` : "Vitórias dão pontos pro seu Elo"}</span>
              </span>
              <span className="cr-text rounded-md bg-black/45 px-2 py-1 text-sm">{myElo ? myElo.points : 0}</span>
            </button>

            {/* arena + botões laterais */}
            <div className="relative mt-3">
              <div className="absolute left-0 top-2 z-10 flex flex-col gap-3">
                <MiniBtn label="Ranking de jogadores" onClick={() => { setRankTab("players"); setTab("ranking"); }}>
                  🏆
                </MiniBtn>
                <MiniBtn label="Regras" onClick={() => setTab("info")}>
                  📜
                </MiniBtn>
              </div>
              <div className="absolute right-0 top-2 z-10 flex flex-col gap-3">
                <MiniBtn label="Desafios 1x1" href="/app/jogos/arena/pvp" badge={invites}>
                  ⚔️
                </MiniBtn>
                <MiniBtn label="Duplas 2x2" href="/app/jogos/arena/duplas">
                  👥
                </MiniBtn>
              </div>
              <div className="px-6">
                <ArenaHero arena={prog.cur} />
              </div>
              <div className="-mt-3 flex flex-col items-center">
                <p className="cr-text flex items-center gap-1.5 rounded-full border-2 border-[#0b2a5c] bg-gradient-to-b from-[#2c58a8] to-[#173b78] px-4 py-1 text-base shadow-[0_3px_0_#0b2a5c]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={prog.cur.art} alt="" className="h-6 w-auto" draggable={false} /> {prog.cur.name}
                </p>
                <p className="cr-text mt-1 flex items-center gap-1.5 text-lg">
                  <span aria-hidden>🏆</span>
                  {trophies}
                  <span className="text-xs opacity-90">· Arena {prog.idx + 1}/{ARENAS.length}</span>
                </p>
              </div>
            </div>

            {/* botões de batalha */}
            <ArenaGateBanner gate={gate} />
            {error && !gate.locked ? <p className="mt-2 rounded-lg bg-black/55 px-3 py-1.5 text-center text-sm font-bold text-rose-200">{error}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={gate.locked ? undefined : onBattle}
                disabled={gate.locked}
                className={`cr-btn cr-btn-yellow cr-text py-4 text-[26px] leading-none ${gate.locked ? "grayscale opacity-60" : ""}`}
              >
                {gate.locked ? "🔒 Batalha" : "Batalha"}
              </button>
              {gate.locked ? (
                <span className="cr-btn cr-btn-blue cr-text flex items-center justify-center py-4 text-[26px] leading-none grayscale opacity-60">🔒 Duplas</span>
              ) : (
                <Link href="/app/jogos/arena/duplas" className="cr-btn cr-btn-blue cr-text flex items-center justify-center py-4 text-[26px] leading-none">
                  Duplas
                </Link>
              )}
            </div>

            {/* espaços de recompensa */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              <Slot open={dailyChestReady} icon="🎁" title="Baú da Arena" sub={dailyChestReady ? "Abrir" : "Amanhã"} onClick={() => setTab("chests")} />
              <Slot icon="🧰" title="Baús" sub="Troféus" onClick={() => setTab("chests")} />
              <Slot icon="⭐" title="XP de hoje" sub={`${winsToday}/${maxWins}`} />
              <Slot icon={prog.next ? prog.next.emoji : "👑"} iconSrc={prog.next?.art} title={prog.next ? "Próx. arena" : "Máxima"} sub={prog.next ? `${prog.next.min - trophies} 🏆` : "🎉"} />
            </div>
            <p className="cr-text mt-2 text-center text-[11px] opacity-90">
              Vitória +{TROPHY_WIN} 🏆 · Derrota −{TROPHY_LOSS} 🏆{prog.next ? ` · ${prog.next.emoji} libera ${prog.next.name}` : ""}
            </p>
          </>
        ) : null}

        {tab === "cards" ? <div className="rounded-2xl bg-[var(--bg)]/95 p-3">{cards}</div> : null}

        {tab === "chests" ? <div className="rounded-2xl bg-[var(--bg)]/95 p-3">{chests}</div> : null}

        {tab === "ranking" ? (
          <div className="rounded-2xl bg-[var(--bg)]/95 p-3">
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(
                [
                  ["players", "🏆 Jogadores"],
                  ["elos", "🏅 Elos"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setRankTab(k)} className={`rounded-xl px-3 py-2 text-sm font-black ${rankTab === k ? "bg-amber-400 text-slate-900" : "bg-[var(--card)] text-[var(--muted)]"}`}>
                  {l}
                </button>
              ))}
            </div>
            {rankTab === "players" ? (
              <>
                <p className="mb-2 text-xs text-[var(--muted)]">Jogadores com {MIN_RANK_TROPHIES} troféus ou mais.</p>
                {trophies < MIN_RANK_TROPHIES ? (
                  <p className="mb-2 rounded-lg bg-amber-400/15 px-3 py-2 text-xs font-bold text-amber-500">Você tem {trophies} 🏆. Faltam {MIN_RANK_TROPHIES - trophies} pra aparecer no ranking!</p>
                ) : me < 0 ? null : (
                  <p className="mb-2 rounded-lg bg-amber-400/15 px-3 py-2 text-xs font-bold text-amber-500">Você está em {me + 1}º lugar com {trophies} 🏆</p>
                )}
                {trophyRanking.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[var(--muted)]">Ninguém chegou a {MIN_RANK_TROPHIES} troféus ainda. Seja o primeiro!</p>
                ) : (
                  <ul className="space-y-1.5">
                    {trophyRanking.map((r, i) => (
                      <li key={r.id} className={`flex items-center gap-2 rounded-xl border-2 px-2 py-1.5 ${r.id === myId ? "border-amber-400 bg-amber-400/10" : "border-[var(--line)] bg-[var(--card)]"}`}>
                        <span className="w-7 text-center text-base font-black">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                        <Avatar url={r.avatar} name={r.name} size={36} />
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block truncate text-sm font-black">{r.name}</span>
                          {r.elo ? <span className="block truncate text-[11px] text-[var(--muted)]">{r.elo}</span> : null}
                        </span>
                        <span className="rounded-full bg-black/60 px-2.5 py-1 text-sm font-black tabular-nums text-white">🏆 {r.trophies}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <ul className="space-y-1.5">
                {eloRanking.map((r, i) => (
                  <li key={r.id} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 ${r.id === myEloId ? "border-amber-400 bg-amber-400/10" : "border-[var(--line)] bg-[var(--card)]"}`}>
                    <span className="w-7 text-center text-base font-black">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-black">{r.name}</span>
                    <span className="text-sm font-black tabular-nums">{r.points} pts</span>
                  </li>
                ))}
                <li className="px-1 pt-1 text-xs text-[var(--muted)]">Vitória contra o computador +1 ponto, vitória no 1x1 ou em duplas +2 (até 5 por dia por jogador).</li>
              </ul>
            )}
          </div>
        ) : null}

        {tab === "info" ? (
          <div className="rounded-2xl bg-[var(--bg)]/95 p-4">
            <p className="text-lg font-black">Como jogar</p>
            <ul className="mt-2 space-y-1.5 text-sm font-semibold text-[var(--muted)]">
              <li>🍞 O Maná (pão do céu) enche sozinho. Cada carta custa um pouco dele.</li>
              <li>👆 Toque numa carta e depois no campo (na sua metade) pra colocar o herói.</li>
              <li>🗼 Derrube as Atalaias (1 coroa) e o Santuário (3 coroas) do adversário.</li>
              <li>⏱️ São 3 minutos. No último minuto o Maná enche em dobro!</li>
              <li>🏆 Vitória dá +{TROPHY_WIN} troféus, derrota tira {TROPHY_LOSS}. Os troféus levam você pelas arenas, que liberam cartas novas.</li>
              <li>🃏 Cada partida e cada baú dão cartas. Juntando cópias de um herói (50, 100, 200…) ele evolui, até o nível 15. Baús comprados com troféus trazem mais cartas.</li>
              <li>🎁 O Baú da Arena é grátis e abre 1 vez por dia.</li>
              <li>⚔️ No 1x1 e em Duplas você joga em tempo real contra colegas do seu Elo.</li>
            </ul>
          </div>
        ) : null}
      </div>

      {/* barra de baixo */}
      <nav className="cr-bar grid grid-cols-5">
        {tabs.map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-0.5 px-1 pb-2 pt-2 ${on ? "bg-gradient-to-b from-[#3b72c4] to-[#244f95]" : ""}`}
              aria-current={on ? "page" : undefined}
            >
              <span className={`text-2xl leading-none ${on ? "scale-125" : "opacity-80"}`} aria-hidden>
                {t.icon}
              </span>
              <span className={`cr-text text-[11px] ${on ? "" : "opacity-70"}`}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
