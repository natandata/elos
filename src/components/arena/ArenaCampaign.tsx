"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishCampaign, startCampaign } from "@/lib/actions/arenaCampaign";
import { CAMPAIGN_DECK, CAMPAIGN_STAGES, CAMPAIGN_TIERS, CAMPAIGN_XP, CAMPAIGN_XP_FEMALE_BONUS, TIER_LABEL, stageBoost, stageUnlocked } from "@/lib/arena/campaign";
import { CAMPAIGN_CARDS, CAMPAIGN_COMBOS } from "@/lib/arena/campaignCards";
import { ARENA_CARD_BY_KEY } from "@/lib/arena/cards";
import { inDeployZone, inField, type Input } from "@/lib/arena/core";
import { createGame, step } from "@/lib/arena/engine";
import type { CampaignFinish } from "@/lib/arena/campaignServer";
import { ARENA_LOAD_MS, ArenaLoadingScreen } from "@/components/games/ArenaLoadingScreen";
import { ArenaPlayfield, type PlayDriver } from "./ArenaPlayfield";
import { CardArt } from "./CardArt";
import { NeryCutscene } from "./NeryCutscene";
import { StageCutscene, hasStageScene } from "./StageCutscene";
import { AT } from "./ArenaText";

/** Arena do Nery (a 3ª, índice 2) */
const NERY_STAGE = 2;

type Tab = "arenas" | "cartas";
type Phase = "menu" | "playing" | "finishing" | "cutscene" | "result";

/** Modo Campanha: 8 arenas em ordem, cada uma contra um personagem do ELOS. Todos veem; só quem tem acesso batalha. */
export function ArenaCampaign({ open, admin, cleared: initialCleared, tiers: initialTiers, opensAt = null }: { open: boolean; admin: boolean; cleared: number[]; tiers: number[]; /** data de abertura definida pelo admin (ISO), se houver */ opensAt?: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("arenas");
  const [phase, setPhase] = useState<Phase>("menu");
  const [cleared, setCleared] = useState<number[]>(initialCleared);
  const [tiers, setTiers] = useState<number[]>(initialTiers);
  const [sel, setSel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<CampaignFinish | null>(null);
  const [driver, setDriver] = useState<PlayDriver | null>(null);
  const [launching, setLaunching] = useState(false);
  const matchRef = useRef<string | null>(null);
  const [lastStage, setLastStage] = useState(0);
  const stageRef = useRef(0);
  const logRef = useRef<Input[]>([]);
  const startingRef = useRef(false);
  const lastSurrender = useRef(false);

  const clearedSet = new Set(cleared);
  const allDone = cleared.length >= CAMPAIGN_STAGES.length;

  async function finish(surrender: boolean) {
    lastSurrender.current = surrender;
    setPhase("finishing");
    const send = () => finishCampaign({ matchId: matchRef.current!, inputs: logRef.current, surrender });
    const res = await send().catch(async () => {
      await new Promise((r) => setTimeout(r, 1500));
      return send().catch(() => ({ error: "Sem conexão. Não foi possível confirmar o resultado." }) as CampaignFinish);
    });
    setVerdict(res);
    if (res.cleared) setCleared(res.cleared);
    if (res.tiers) setTiers(res.tiers);
    // depois de toda batalha contra o Nery (arena 3), qualquer que seja o resultado, tem a cena final de 10 s
    setPhase(!res.error && (stageRef.current === NERY_STAGE || hasStageScene(stageRef.current)) ? "cutscene" : "result");
    router.refresh();
  }

  async function begin(stage: number) {
    if (startingRef.current) return;
    startingRef.current = true;
    setError(null);
    setVerdict(null);
    setLaunching(true);
    const wait = new Promise<void>((r) => setTimeout(r, ARENA_LOAD_MS));
    const res = await startCampaign(stage).catch(() => ({ error: "Sem conexão. Tente de novo." }) as { error?: string; matchId?: string; seed?: number; tier?: number });
    if (res.error || !res.matchId || res.seed === undefined) {
      setLaunching(false);
      setError(res.error ?? "Não foi possível começar.");
      startingRef.current = false;
      return;
    }
    await wait;
    const st = CAMPAIGN_STAGES[stage];
    matchRef.current = res.matchId;
    setLastStage(stage);
    stageRef.current = stage;
    logRef.current = [];
    const game = createGame(res.seed, CAMPAIGN_DECK, CAMPAIGN_DECK, { botBoost: stageBoost(stage, res.tier ?? 0) });
    let pending: Input[] = [];
    setDriver({
      game,
      mySide: 0,
      arena: 0,
      campaign: { theme: st.theme, scenery: st.scenery, name: st.name },
      opponentLabel: ARENA_CARD_BY_KEY.get(st.boss)?.name ?? "Computador",
      inputDelay: 0,
      advance: () => {
        const inputs = pending;
        pending = [];
        return step(game, inputs, [1]);
      },
      place: (slot, x, y) => {
        const card = ARENA_CARD_BY_KEY.get(game.slots[0][slot]);
        if (!card || game.mana[0] + 1e-9 < card.cost) return false;
        if (card.kind === "unit" ? !inDeployZone(0, x, y, game) : !inField(x, y)) return false;
        const input: Input = { tick: game.tick, side: 0, slot, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
        pending.push(input);
        logRef.current.push(input);
        return true;
      },
      isPending: () => false,
    });
    setPhase("playing");
    setLaunching(false);
    startingRef.current = false;
  }

  if (phase === "playing" && driver) {
    return (
      <ArenaPlayfield
        driver={driver}
        onOver={() => void finish(false)}
        onLeave={() => {
          if (window.confirm("Desistir da partida?")) void finish(true);
        }}
      />
    );
  }

  if (phase === "cutscene") return lastStage === NERY_STAGE ? <NeryCutscene onDone={() => setPhase("result")} /> : <StageCutscene stage={lastStage} onDone={() => setPhase("result")} />;

  if (phase === "finishing" || phase === "result") {
    const r = verdict;
    const st = CAMPAIGN_STAGES[lastStage];
    const next = lastStage + 1 < CAMPAIGN_STAGES.length ? lastStage + 1 : null;
    return (
      <div className="card p-6 text-center">
        {phase === "finishing" || !r ? (
          <p className="text-lg font-black">Conferindo o resultado…</p>
        ) : r.error ? (
          <>
            <p className="text-5xl" aria-hidden><AT>⚠️</AT></p>
            <p className="mt-2 font-bold text-rose-700">{r.error}</p>
            <button type="button" onClick={() => void finish(lastSurrender.current)} className="btn btn-ghost mt-3">Tentar confirmar de novo</button>
          </>
        ) : (
          <>
            <p className="text-6xl" aria-hidden>{r.result === "win" ? <AT>{"🏆"}</AT> : r.result === "draw" ? <AT>{"🤝"}</AT> : <AT>{"😅"}</AT>}</p>
            <h2 className="mt-2 text-2xl font-black">{r.result === "win" ? "Vitória!" : r.result === "draw" ? "Empate" : "Derrota"}</h2>
            <p className="mt-1 text-lg font-bold tabular-nums"><AT>👑 </AT>{r.crownsMe ?? 0} x {r.crownsBot ?? 0}<AT> 👑</AT></p>
            {r.result === "win" ? (
              <>
                <p className="mt-2 text-sm font-bold">
                  {r.advanced ? (r.firstClear ? `Você venceu a ${st.name}!` : `Batalha ${(r.tier ?? 0) + 1} de ${CAMPAIGN_TIERS} vencida na ${st.name}.`) : `Mais uma vitória na ${st.name}.`}
                </p>
                {r.advanced && !r.firstClear ? <p className="mt-2 rounded-2xl bg-sky-100 px-4 py-2 text-sm font-black text-sky-900">Próxima batalha: {TIER_LABEL[Math.min(CAMPAIGN_TIERS - 1, (r.tier ?? 0) + 1)]}</p> : null}
                {(r.xp ?? 0) > 0 ? <p className="mt-3 inline-block rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-lg font-black text-[var(--accent-strong)]">+{r.xp} XP</p> : null}
                {r.firstClear && next !== null ? <p className="mt-3 rounded-2xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-900"><AT>🔓 Nova arena liberada: </AT>{CAMPAIGN_STAGES[next].name}</p> : null}
                {r.firstClear && next === null ? <p className="mt-3 rounded-2xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-900"><AT>🎉 Você zerou a campanha!</AT></p> : null}
              </>
            ) : r.tooFast ? <p className="mt-2 text-sm font-bold text-rose-700">Não deu para confirmar esta vitória: a partida não durou o tempo que o placar mostra. Jogue de novo.</p> : <p className="mt-2 text-sm text-[var(--muted)]">Tente de novo: escolha bem quando soltar cada carta.</p>}
          </>
        )}
        {phase === "result" ? (
          <div className="mt-6 grid gap-3">
            {r?.result === "win" && r.advanced && !r.firstClear ? null : <button type="button" onClick={() => void begin(lastStage)} className="btn btn-primary !py-3 !text-base">Jogar de novo</button>}
            {r?.result === "win" && r.advanced && !r.firstClear ? <button type="button" onClick={() => void begin(lastStage)} className="btn btn-primary !py-3 !text-base"><AT>Próxima batalha ▶</AT></button> : null}
            {r?.result === "win" && r.firstClear && next !== null ? <button type="button" onClick={() => void begin(next)} className="btn btn-primary !py-3 !text-base"><AT>Próxima arena ▶</AT></button> : null}
            <button type="button" onClick={() => setPhase("menu")} className="btn btn-ghost">Voltar à Campanha</button>
          </div>
        ) : null}
        {launching ? <ArenaLoadingScreen label="Preparando a batalha…" /> : null}
      </div>
    );
  }

  const stage = sel !== null ? CAMPAIGN_STAGES[sel] : null;
  const canPlay = (n: number) => open && (admin || stageUnlocked(n, clearedSet));

  return (
    <div className="space-y-3">
      <section className="card p-3">
        <p className="text-lg font-black"><AT>🛡️ Campanha</AT></p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Enfrente os 8 personagens do ELOS, um por arena, do mais fraco ao mais forte. Você e o computador jogam com o mesmo baralho dos 8. Cada arena precisa ser vencida 3 vezes: a 1ª batalha no nível normal, a 2ª 15% mais difícil e a 3ª 25% mais difícil. Vencendo as 3, a próxima arena é liberada e você ganha +{CAMPAIGN_XP} XP (Elos femininos ganham +{CAMPAIGN_XP_FEMALE_BONUS} XP a mais). As batalhas da campanha não contam nas partidas do dia e podem ser jogadas sem limite.
        </p>
        <p className="mt-2 text-xs font-bold">{cleared.length}/{CAMPAIGN_STAGES.length} arenas vencidas ({tiers.reduce((a, b) => a + b, 0)}/{CAMPAIGN_STAGES.length * CAMPAIGN_TIERS} batalhas){allDone ? <AT>{" 🎉"}</AT> : ""}</p>
        {!open ? <p className="mt-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-900"><AT>🔒 A campanha ainda não foi liberada. Você pode ver as cartas e as arenas, mas só consegue batalhar quando ela abrir</AT>{opensAt ? `: ${new Date(opensAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}` : ""}.</p> : null}
        {admin ? <p className="mt-2 text-[11px] font-bold text-sky-600">Admin: você pode jogar qualquer arena para testar.</p> : null}
      </section>

      <div className="grid grid-cols-2 gap-1">
        {([["arenas", "Arenas"], ["cartas", "Cartas"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-xl py-2 text-sm font-black ${tab === k ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--line)] text-[var(--muted)]"}`}>{l}</button>
        ))}
      </div>

      {tab === "arenas" ? (
        <ul className="space-y-2">
          {CAMPAIGN_STAGES.map((s, i) => {
            const boss = ARENA_CARD_BY_KEY.get(s.boss)!;
            const done = clearedSet.has(i);
            const locked = !canPlay(i);
            return (
              <li key={s.n}>
                <button type="button" onClick={() => setSel(i)} className={`relative block w-full overflow-hidden rounded-2xl border-[3px] text-left shadow ${done ? "border-emerald-400" : locked ? "border-slate-500" : "border-amber-400"}`} style={{ background: s.theme.grass }}>
                  <span className="flex h-36 items-center justify-start bg-gradient-to-r from-black/0 to-black/25 pl-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.art} alt="" className={`h-[78%] w-auto max-w-[55%] object-contain drop-shadow-[0_6px_6px_rgba(0,0,0,0.45)] ${locked ? "brightness-50" : ""}`} draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </span>
                  <span className="absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/80 via-black/10 to-transparent p-3">
                    <span className="min-w-0 text-white">
                      <span className="block text-[11px] font-black uppercase tracking-wide text-amber-200">Arena {s.n} · {s.setting}</span>
                      <span className="block truncate text-lg font-black [text-shadow:0_2px_6px_#000]"><AT>{s.emoji}</AT> {boss.name}</span>
                      <span className="block text-[11px] font-black text-white/90"><AT>{"●".repeat(tiers[i] ?? 0)}{"○".repeat(CAMPAIGN_TIERS - (tiers[i] ?? 0))}</AT> {tiers[i] >= CAMPAIGN_TIERS ? "vencida" : `batalha ${(tiers[i] ?? 0) + 1}/${CAMPAIGN_TIERS}`}</span>
                    </span>
                    <span className="shrink-0 text-2xl" aria-hidden>{done ? <AT>{"✅"}</AT> : locked ? <AT>{"🔒"}</AT> : <AT>{"⚔️"}</AT>}</span>
                  </span>
                  <CardArt card={boss} className="absolute bottom-0 right-12 h-[88%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
        <div className="card space-y-1 p-3 text-xs">
          <p className="font-black"><AT>✨ Combos</AT></p>
          {CAMPAIGN_COMBOS.map((c) => (
            <p key={c.id}>Com <b>{c.label}</b> vivos em campo do mesmo lado, os outros personagens brilham e ganham <b>{c.effect}</b>.</p>
          ))}
          <p className="text-[var(--muted)]">Valem para você e para o computador.</p>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {CAMPAIGN_CARDS.map((c) => (
            <li key={c.key} className="card flex flex-col p-2.5">
              <div className="rounded-xl bg-gradient-to-b from-[#4a90e2] to-[#2d62b8] p-2"><CardArt card={c} className="h-28" /></div>
              <p className="mt-2 text-sm font-black leading-tight">{c.name} <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] text-white"><AT>🍞 </AT>{c.cost}</span></p>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">{c.desc}</p>
              <p className="mt-1 text-[11px] font-bold tabular-nums"><AT>❤️ </AT>{c.hp}{c.count ? ` ×${c.count}` : ""}<AT> · ⚔️ </AT>{c.dmg}</p>
            </li>
          ))}
        </ul>
        </>
      )}

      {stage ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={() => setSel(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[var(--surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-44 items-center justify-center" style={{ background: stage.theme.grass }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stage.art} alt={stage.name} className="h-[88%] w-auto max-w-[92%] object-contain drop-shadow-[0_6px_6px_rgba(0,0,0,0.4)]" draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="p-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-amber-600">Arena {stage.n} · {stage.setting}</p>
              <p className="text-xl font-black">{stage.name}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{stage.blurb}</p>
              <p className="mt-2 text-xs font-bold">{(tiers[sel!] ?? 0) >= CAMPAIGN_TIERS ? `Arena vencida · rejogar no nível: ${TIER_LABEL[CAMPAIGN_TIERS - 1]}` : `Batalha ${(tiers[sel!] ?? 0) + 1} de ${CAMPAIGN_TIERS} · ${TIER_LABEL[tiers[sel!] ?? 0]}`}</p>
              <p className="mt-1 text-xs"><b>Chefe:</b> {ARENA_CARD_BY_KEY.get(stage.boss)?.name} · <b>Dificuldade:</b> <AT>{"★".repeat(Math.min(5, Math.ceil((sel! + 1) * 5 / 8)))}</AT></p>
              {error ? <p className="mt-2 text-xs font-bold text-rose-600">{error}</p> : null}
              <div className="mt-3 grid gap-2">
                {canPlay(sel!) ? (
                  <button type="button" onClick={() => { setSel(null); void begin(sel!); }} className="btn btn-primary !py-3 !text-base"><AT>⚔️ Batalhar</AT></button>
                ) : (
                  <button type="button" disabled className="btn btn-primary !py-3 !text-base opacity-50">
                    {!open ? <AT>{"🔒 Campanha bloqueada"}</AT> : <AT>{"🔒 Vença a arena anterior"}</AT>}
                  </button>
                )}
                <button type="button" onClick={() => setSel(null)} className="btn btn-ghost">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Link href="/app/jogos/arena" className="btn btn-ghost block w-full text-center"><AT>← Voltar à Arena</AT></Link>
      {launching ? <ArenaLoadingScreen label="Preparando a batalha…" /> : null}
    </div>
  );
}
