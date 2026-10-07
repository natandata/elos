"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { ARENAS, TROPHY_LOSS, TROPHY_WIN, arenaProgress } from "@/lib/arena/arenas";
import { ArenaHero } from "./ArenaHero";
import { ArenaGateBanner } from "./ArenaGateBanner";
import { ChestIcon, LampIcon } from "./ArenaIcons";
import { useNow, useOnlineMap, type Presence } from "./arenaPresence";
import type { GateInfo } from "@/lib/arena/gate";

export type RankRow = { id: string; name: string; avatar: string | null; elo: string | null; trophies: number };
export type EloRow = { id: string; name: string; points: number };
/** Placar do dia (vitórias, derrotas e empates de hoje, em todos os modos). */
export type DayRecord = { w: number; l: number; d: number };
export type ArenaTab = "battle" | "cards" | "chests" | "ranking" | "info";

const MIN_RANK_TROPHIES = 30;

const MODE_LABEL: Record<string, string> = { cpu: "contra o computador", pvp: "1x1", duo: "em duplas", tournament: "no torneio" };
const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Linha de situação de um jogador no ranking: offline, online ou jogando (arena, placar e tempo). */
function LiveLine({ p, now }: { p: Presence | undefined; now: number }) {
  if (!p) return <span className="block truncate text-[11px] text-[var(--muted)]">⚪ Offline</span>;
  if (p.s !== "playing") return <span className="block truncate text-[11px] font-bold text-emerald-500">🟢 Online</span>;
  const arena = p.arena !== undefined ? ARENAS[p.arena] : undefined;
  const lead = p.lead === "win" ? { t: "ganhando", c: "text-emerald-500" } : p.lead === "lose" ? { t: "perdendo", c: "text-rose-500" } : { t: "empatado", c: "text-amber-500" };
  const left = p.endsAt ? clock(p.endsAt - now) : null;
  return (
    <span className="block truncate text-[11px] font-bold">
      <span className="text-sky-500">⚔️ Jogando {MODE_LABEL[p.mode ?? "cpu"]}</span>
      {arena ? <span className="text-[var(--muted)]"> · {arena.name}</span> : null}
      <span className={`${lead.c}`}> · {lead.t}{p.crowns ? ` (${p.crowns[0]}x${p.crowns[1]})` : ""}</span>
      {left ? <span className="text-[var(--muted)]"> · ⏱ {left}</span> : null}
    </span>
  );
}

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

function Slot({ icon, iconSrc, iconNode, title, sub, open, href, onClick }: { icon: string; iconSrc?: string; iconNode?: ReactNode; title: string; sub: string; open?: boolean; href?: string; onClick?: () => void }) {
  const body = (
    <div className={`cr-slot ${open ? "cr-slot-open" : ""} flex h-full flex-col items-center justify-between px-1 py-1.5 text-center`}>
      <p className="cr-text text-[10px] leading-none">{title}</p>
      {iconNode ? (
        <span className="flex h-9 items-center justify-center drop-shadow">{iconNode}</span>
      ) : iconSrc ? (
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
  viewArena,
  maxArena,
  onViewArena,
  dailyChestReady,
  chests,
  winsToday,
  dayRecord,
  maxWins,
  eloRanking,
  myEloId,
  trophyRanking,
  myId,
  invites,
  onBattle,
  error,
  cards,
  gate,
  openTournaments,
}: {
  tab: ArenaTab;
  setTab: (t: ArenaTab) => void;
  trophies: number;
  /** arena mostrada (e usada na próxima batalha) */
  viewArena: number;
  /** maior arena já alcançada */
  maxArena: number;
  onViewArena: (i: number) => void;
  dailyChestReady: boolean;
  chests: ReactNode;
  winsToday: number;
  dayRecord: DayRecord;
  maxWins: number;
  eloRanking: EloRow[];
  myEloId: string | null;
  trophyRanking: RankRow[];
  myId: string;
  invites: number;
  onBattle: () => void;
  error: string | null;
  cards: ReactNode;
  gate: GateInfo;
  openTournaments: number;
}) {
  const prog = arenaProgress(trophies);
  const onlineMap = useOnlineMap();
  const now = useNow();
  const shown = ARENAS[Math.min(viewArena, ARENAS.length - 1)];
  const training = shown.key !== prog.cur.key;
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
      <div className="min-h-[700px] px-3 pb-4 pt-3">
        {tab === "battle" ? (
          <>
            {/* atalhos de cima */}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/app/jogos/arena/missoes" className="cr-panel flex min-w-0 items-center gap-1.5 px-2 py-2 active:translate-y-[2px]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#1c4f9a] text-lg shadow-inner" aria-hidden>
                  🎯
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="cr-text block text-[15px]">Missões</span>
                  <span className="cr-text block text-[10px] opacity-90">da Arena</span>
                </span>
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

            {/* campanha: 8 arenas contra os personagens do ELOS */}
            <Link href="/app/jogos/arena/campanha" className="cr-panel mt-2 flex items-center gap-2 px-3 py-2 active:translate-y-[2px]">
              <span className="text-2xl" aria-hidden>
                🛡️
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="cr-text block text-[15px]">Campanha</span>
                <span className="cr-text block truncate text-[11px] opacity-90">8 arenas contra os personagens do ELOS</span>
              </span>
            </Link>

            {/* torneios criados pelo admin */}
            <Link
              href="/app/jogos/arena/torneios"
              className="cr-panel mt-2 flex items-center gap-2 px-3 py-2 active:translate-y-[2px]"
            >
              <span className="text-2xl" aria-hidden>
                🏆
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="cr-text block text-[15px]">Torneios</span>
                <span className="cr-text block truncate text-[11px] opacity-90">{openTournaments > 0 ? `${openTournaments} ${openTournaments === 1 ? "aberto" : "abertos"} · inscreva-se e ganhe prêmios` : "Campeonatos com prêmios, 1x1 e em duplas"}</span>
              </span>
              {openTournaments > 0 ? <span className="cr-text rounded-full bg-red-600 px-2 py-0.5 text-sm">{openTournaments}</span> : null}
            </Link>

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
                <ArenaHero arena={shown} />
              </div>
              <div className="-mt-3 flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Arena anterior"
                    disabled={viewArena <= 0}
                    onClick={() => onViewArena(viewArena - 1)}
                    className="cr-panel flex h-9 w-9 items-center justify-center text-xl disabled:opacity-35 active:translate-y-[2px]"
                  >
                    ‹
                  </button>
                  <p className="cr-text flex items-center gap-1.5 rounded-full border-2 border-[#0b2a5c] bg-gradient-to-b from-[#2c58a8] to-[#173b78] px-4 py-1 text-base shadow-[0_3px_0_#0b2a5c]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shown.art} alt="" className="h-6 w-auto" draggable={false} /> {shown.name}
                  </p>
                  <button
                    type="button"
                    aria-label="Próxima arena"
                    disabled={viewArena >= maxArena}
                    onClick={() => onViewArena(viewArena + 1)}
                    className="cr-panel flex h-9 w-9 items-center justify-center text-xl disabled:opacity-35 active:translate-y-[2px]"
                  >
                    ›
                  </button>
                </div>
                <p className="cr-text mt-1 flex items-center gap-1.5 text-lg">
                  <span aria-hidden>🏆</span>
                  {trophies}
                  <span className="text-xs opacity-90">· Arena {viewArena + 1}/{ARENAS.length}</span>
                </p>
                {training ? <p className="mt-0.5 rounded-full bg-black/45 px-3 py-0.5 text-[11px] font-black text-sky-200">🏋️ Treino: não ganha nem perde troféus</p> : null}
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
              <Link href="/app/jogos/arena/duplas" className="cr-btn cr-btn-blue cr-text flex items-center justify-center py-4 text-[26px] leading-none">
                Duplas
              </Link>
            </div>

            {/* espaços de recompensa */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              <Slot open={dailyChestReady} icon="🎁" iconNode={<ChestIcon variant="wood" open={dailyChestReady} className="h-9 w-auto" />} title="Baú da Arena" sub={dailyChestReady ? "Abrir" : "Amanhã"} onClick={() => setTab("chests")} />
              <Slot icon="🧰" iconNode={<ChestIcon variant="gold" className="h-9 w-auto" />} title="Baús" sub="Troféus" onClick={() => setTab("chests")} />
              <Slot icon="⭐" iconNode={<LampIcon className="h-9 w-auto" />} title="XP de hoje" sub={`${winsToday}/${maxWins}`} />
              <Slot icon={prog.next ? prog.next.emoji : "👑"} iconSrc={prog.next?.art} title={prog.next ? "Próx. arena" : "Máxima"} sub={prog.next ? `${prog.next.min - trophies} 🏆` : "🎉"} />
            </div>
            {/* placar do dia: quantas partidas já jogou hoje e como foram */}
            <div className="cr-panel mt-2 px-3 py-2" aria-label="Seu placar de hoje">
              <p className="cr-text text-center text-[11px] uppercase tracking-wide opacity-90">Seu dia · {dayRecord.w + dayRecord.l + dayRecord.d} {dayRecord.w + dayRecord.l + dayRecord.d === 1 ? "partida" : "partidas"}</p>
              <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                <span className="rounded-lg bg-emerald-500/25 py-1"><b className="cr-text block text-xl leading-none tabular-nums">{dayRecord.w}</b><span className="cr-text text-[10px]">🏆 vitórias</span></span>
                <span className="rounded-lg bg-amber-400/25 py-1"><b className="cr-text block text-xl leading-none tabular-nums">{dayRecord.d}</b><span className="cr-text text-[10px]">🤝 empates</span></span>
                <span className="rounded-lg bg-rose-500/25 py-1"><b className="cr-text block text-xl leading-none tabular-nums">{dayRecord.l}</b><span className="cr-text text-[10px]">😅 derrotas</span></span>
              </div>
            </div>
            <p className="cr-text mt-2 text-center text-[11px] opacity-90">
              {training ? "Treino numa arena já vencida: troféus e XP não mudam" : <>Vitória +{TROPHY_WIN} 🏆 · Derrota −{TROPHY_LOSS} 🏆{prog.next ? ` · ${prog.next.emoji} libera ${prog.next.name}` : ""}</>}
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
                          <LiveLine p={onlineMap.get(r.id)} now={now} />
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
              <li>🏅 No 1x1 o vencedor rouba 30 🏆 do perdedor e ganha uma medalha de vitória contra ele. Empate (mesmas coroas, até 0x0) não vale nada.</li>
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
