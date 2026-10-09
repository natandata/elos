"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PaperDoll } from "./PaperDoll";
import { RunwayWalk } from "./RunwayWalk";
import { StarsStatic } from "./Stars";
import { RARITY_ICON, SparkleBurst, Sparkles, rarityOf } from "./Vh";
import { judgePractice, submitRunwayLook, type JuryResult, type PublishResult } from "@/lib/actions/runway";
import { BLUSHES, BROW_COLORS, BROW_STYLES, DEFAULT_BEAUTY, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, LASH_STYLES, LINER_COLORS, LINER_STYLES, LIPS, LIP_STYLES, MARKS, SHADOWS, SKINS, baseFromBeauty, type Beauty, type Mark } from "@/lib/games/dress/beauty";
import { ITEM_BY_ID, SLOTS, familiesBySlot, type Look, type Slot } from "@/lib/games/dress/items";
import { DRESS_ITEM_LIMIT, POSES, cleanPose, countItems, type PoseKey } from "@/lib/games/dress/live";
import { fmtClock } from "@/lib/games/dress/rules";
import type { BibleTheme } from "@/lib/games/dress/themes";

const MallStore3D = dynamic(() => import("./MallStore3D").then((m) => m.MallStore3D), { ssr: false, loading: () => <p className="grid h-full place-items-center text-sm font-black text-purple-900">Abrindo a loja…</p> });

type Cat = "hair" | "makeup" | "skin" | "worn" | "pose" | Slot;

/** Sala ao vivo: o look vai sendo salvo no servidor e o "pronto" só avisa as outras (dá para continuar mexendo). */
export type LiveCamarim = {
  initial: { look: Look; beauty: unknown; pose: string; ready: boolean };
  /** devolve a mensagem de erro, ou null se salvou */
  onSave: (look: Look, beauty: Beauty, pose: PoseKey, ready: boolean) => Promise<string | null>;
};
type Snap = { look: Look; beauty: Beauty };
const RAIL: { side: "l" | "r"; key: Cat; label: string; icon: string }[] = [
  { side: "l", key: "hair", label: "Cabelo", icon: "💇‍♀️" },
  { side: "l", key: "makeup", label: "Make", icon: "💄" },
  { side: "l", key: "skin", label: "Pele", icon: "🎨" },
  { side: "l", key: "head", label: "Cabeça", icon: "👑" },
  { side: "r", key: "tunic", label: "Roupa", icon: "👗" },
  { side: "r", key: "mantle", label: "Manto", icon: "🧣" },
  { side: "r", key: "hand", label: "Mãos", icon: "🪄" },
  { side: "r", key: "shoes", label: "Calçado", icon: "👠" },
];


function store<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* sem armazenamento: segue sem rascunho */
  }
}

/**
 * Camarim em tela cheia, no jeito do Dress to Impress: tema, relógio, armário por categorias com cores,
 * personalização (cabelo, pele, make) e a avaliação do júri bíblico depois de "Pronto".
 * `daily`: valendo o desfile do dia (tempo contado pelo servidor). `practice`: treino sem tempo e sem bilhetes.
 */
export function Camarim({ theme, mode, msLeft, practiceN = 1, draftKey, exitHref, live }: { theme: BibleTheme; mode: "daily" | "practice" | "live"; msLeft?: number; practiceN?: number; draftKey: string; exitHref: string; live?: LiveCamarim }) {
  const router = useRouter();
  const daily = mode === "daily";
  const isLive = mode === "live" && !!live;
  const timed = daily || isLive;
  const [pose, setPose] = useState<PoseKey>(cleanPose(live?.initial.pose));
  const [ready, setReady] = useState(!!live?.initial.ready);
  const [saved, setSaved] = useState(true);
  // sala ao vivo: `rev` sobe a cada mudança e `savedRev` é a última que o servidor confirmou
  const [rev, setRev] = useState(0);
  const [savedRev, setSavedRev] = useState(0);
  const dirty = rev !== savedRev;
  const sending = useRef(false);
  const [retry, setRetry] = useState(0);
  const [look, setLook] = useState<Look>({});
  const [beauty, setBeauty] = useState<Beauty>(DEFAULT_BEAUTY);
  const [cat, setCat] = useState<Cat>("tunic");
  // "mall" = loja 3D andando pelo salão; "list" = armário em lista (aparelhos sem 3D, ou preferência)
  const [view, setView] = useState<"mall" | "list">(() => {
    try {
      return localStorage.getItem("vh:view") === "list" ? "list" : "mall";
    } catch {
      return "mall";
    }
  });
  const [closetOpen, setClosetOpen] = useState(false);
  const mall = view === "mall";
  const changeView = (v: "mall" | "list") => {
    setView(v);
    setClosetOpen(false);
    try {
      localStorage.setItem("vh:view", v);
    } catch {
      /* sem armazenamento */
    }
  };
  const openPanel = (c: Cat) => {
    setCat(c);
    setClosetOpen(true);
  };
  const [left, setLeft] = useState(timed ? Math.max(0, (msLeft ?? 0) / 1000) : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [clue, setClue] = useState(true);
  const [done, setDone] = useState<{ jury: JuryResult; tickets: number; look: Look } | null>(null);
  const [past, setPast] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const deadline = useRef(0);
  const submitted = useRef(false);

  // o relógio da tela é quem manda: conta a partir do que o servidor disse que resta
  useEffect(() => {
    deadline.current = Date.now() + (msLeft ?? 0);
  }, [msLeft]);

  // rascunho (o look e a avatar ficam guardados se a página recarregar)
  useEffect(() => {
    const t = setTimeout(() => {
      // na sala ao vivo o rascunho mora no servidor (se a página recarregar, o look volta de lá)
      const serverLook = live?.initial.look;
      setLook(serverLook && Object.keys(serverLook).length ? serverLook : store<Look>(draftKey, {}));
      const serverBeauty = live?.initial.beauty && typeof live.initial.beauty === "object" ? (live.initial.beauty as Partial<Beauty>) : {};
      setBeauty({ ...DEFAULT_BEAUTY, ...store<Partial<Beauty>>("vh:beauty", {}), ...serverBeauty });
    }, 0);
    return () => clearTimeout(t);
    // o estado inicial do servidor só vale na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  useEffect(() => {
    const t = setTimeout(() => setClue(false), 9000);
    return () => clearTimeout(t);
  }, []);

  const finish = useCallback(
    async (auto: boolean) => {
      if (submitted.current) return;
      const l: Look = { ...look };
      if (!l.tunic) {
        if (!auto) return setError("Escolha uma roupa para o seu look.");
        l.tunic = ITEM_BY_ID.has("tunic_simple") ? "tunic_simple" : undefined;
      }
      if (isLive && live) {
        // sala ao vivo: "pronta" avisa as outras; o look continua editável até o relógio zerar
        if (sending.current) return;
        sending.current = true;
        setBusy(true);
        setError(null);
        const sentRev = rev;
        const err = await live.onSave(l, beauty, pose, true);
        sending.current = false;
        setBusy(false);
        if (err) {
          if (!auto) setError(err);
          return;
        }
        setSavedRev(sentRev);
        setSaved(true);
        setReady(true);
        save("vh:beauty", beauty);
        return;
      }
      submitted.current = true;
      setBusy(true);
      setError(null);
      const r = await (daily ? submitRunwayLook(l, beauty) : judgePractice(l, practiceN)).catch((): PublishResult => ({ error: "Sem conexão. Tente de novo." }));
      setBusy(false);
      if (r.error || !r.jury) {
        submitted.current = false;
        return setError(r.error ?? "Não foi possível enviar.");
      }
      save("vh:beauty", beauty);
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ok */
      }
      setDone({ jury: r.jury, tickets: r.tickets ?? 0, look: l });
    },
    [look, beauty, pose, rev, daily, isLive, live, practiceN, draftKey],
  );

  useEffect(() => {
    if (!timed || done) return;
    const id = setInterval(() => {
      const s = Math.max(0, (deadline.current - Date.now()) / 1000);
      setLeft(s);
      // ao vivo: nos últimos segundos manda o que estiver na tela (o servidor congela o look quando o tempo acaba)
      if (isLive ? s <= 2.5 && dirty : s <= 0) void finish(true);
    }, 250);
    return () => clearInterval(id);
  }, [timed, isLive, dirty, done, finish]);

  // sala ao vivo: salva sozinha um pouco depois de cada mudança (sem marcar "pronta")
  useEffect(() => {
    if (!isLive || !live || !dirty) return;
    const t = setTimeout(async () => {
      if (sending.current) return;
      sending.current = true;
      const sentRev = rev;
      const err = await live.onSave(look, beauty, pose, false);
      sending.current = false;
      if (!err) {
        // se mudou de novo enquanto enviava, continua "sujo" e salva outra vez
        setSavedRev(sentRev);
        setSaved(true);
        setError(null);
        setRetry(0);
      } else {
        // falhou: avisa e tenta de novo daqui a pouco (antes ficava "salvando…" para sempre, sem aviso)
        setError(err);
        setRetry((n) => n + 1);
      }
    }, retry > 0 ? 3000 : 1400);
    return () => clearTimeout(t);
  }, [isLive, live, dirty, rev, look, beauty, pose, retry]);

  /** qualquer mudança no look ao vivo desmarca o "pronta" e agenda o salvamento */
  function touched() {
    if (!isLive) return;
    setRev((r) => r + 1);
    setSaved(false);
    setReady(false);
  }

  function remember() {
    setPast((p) => [...p.slice(-39), { look, beauty }]);
    setFuture([]);
  }
  function change(next: Look) {
    // limite de itens: tirar ou trocar sempre pode; só não deixa passar do teto
    if (countItems(next) > DRESS_ITEM_LIMIT && countItems(next) > countItems(look)) {
      setError(`Limite de ${DRESS_ITEM_LIMIT} itens: tire uma peça antes de pôr outra.`);
      return;
    }
    setError(null);
    remember();
    setLook(next);
    save(draftKey, next);
    setBurst((b) => b + 1);
    touched();
  }
  const equip = (slot: Slot, id: string | undefined) => change({ ...look, [slot]: id });
  const tweak = (patch: Partial<Beauty>) => {
    remember();
    setBeauty((b) => ({ ...b, ...patch }));
    setBurst((b) => b + 1);
    touched();
  };
  const pickPose = (k: PoseKey) => {
    setPose(k);
    touched();
  };
  function undo() {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast(past.slice(0, -1));
    setFuture((f) => [...f, { look, beauty }]);
    setLook(prev.look);
    setBeauty(prev.beauty);
    save(draftKey, prev.look);
    touched();
  }
  function redo() {
    const next = future[future.length - 1];
    if (!next) return;
    setFuture(future.slice(0, -1));
    setPast((p) => [...p, { look, beauty }]);
    setLook(next.look);
    setBeauty(next.beauty);
    save(draftKey, next.look);
    touched();
  }
  const exit = () => {
    if (timed && !window.confirm(isLive ? "Sair da sala? A rodada continua sem você." : "Sair do camarim? O tempo continua correndo.")) return;
    router.push(exitHref);
  };

  const base = baseFromBeauty(beauty);

  // ---------------------------------------------------------------- resultado (desfile + júri)
  if (done) {
    const j = done.jury;
    return (
      <div className="vh-room" style={{ background: "linear-gradient(180deg, #5a1238 0%, #34104f 45%, #1c0b36 100%)" }}>
        <Sparkles />
        <div className="relative z-[2] flex-1 overflow-y-auto px-3 pb-6 pt-4">
          <p className="vh-title mb-3 text-center text-3xl">{daily ? "Seu desfile!" : "Treino concluído"}</p>
          <RunwayWalk base={base} look={done.look} name="você" scene={theme.scene} />
          <div className="vh-panel vh-pop mx-auto mt-4 max-w-[400px] text-center">
            <p className="vh-h2">Júri bíblico · {theme.name}</p>
            <div className="my-1">
              <StarsStatic value={j.stars} className="!text-3xl" />
            </div>
            <p className="text-xs text-purple-100">{j.fidelity} de 10 pontos de fidelidade à história</p>
            {daily ? (
              <p className="mt-2 text-lg font-black text-amber-200">+{done.tickets} 🎫 Bilhetes Dourados</p>
            ) : (
              <p className="mt-2 text-xs font-bold text-sky-200">🏋️ Treino: não vale bilhetes</p>
            )}
          </div>
          <ul className="mx-auto mt-3 max-w-[400px] space-y-2">
            {j.slots.map((r, i) => (
              <li key={r.slot} className="vh-panel vh-pop !p-3 text-sm" style={{ animationDelay: `${i * 0.08}s` }}>
                <p className="font-black text-amber-100">
                  {r.points === 2 ? "✅" : r.points === 1 ? "🟡" : "❌"} {r.label}: {r.picked || "—"}
                  <span className="float-right text-xs text-amber-300">+{r.points}</span>
                </p>
                {r.points < 2 && r.ideal ? <p className="mt-0.5 text-xs font-bold text-emerald-300">Mais fiel: {r.ideal}</p> : null}
                <p className="mt-0.5 text-xs text-purple-100/90">{r.note}</p>
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-5 flex max-w-[400px] flex-col gap-3">
            {daily ? (
              <button type="button" className="vh-btn" onClick={() => router.push("/app/jogos/vestir/passarela")}>
                📸 Ver o desfile e avaliar
              </button>
            ) : (
              <button type="button" className="vh-btn" onClick={() => router.push(`/app/jogos/vestir/treino?n=${practiceN + 1}`)}>
                🏋️ Treinar com outro tema
              </button>
            )}
            <button type="button" className="vh-btn vh-btn-dark" onClick={() => router.push(exitHref)}>
              ← Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- camarim
  const slotCat = SLOTS.find((s) => s.key === cat)?.key;
  const fams = slotCat ? familiesBySlot(slotCat) : [];
  const equippedId = slotCat ? look[slotCat] : undefined;
  const equippedFam = equippedId ? ITEM_BY_ID.get(equippedId)?.family : undefined;
  const famItems = equippedFam && slotCat ? (fams.find((f) => f.family === equippedFam)?.items ?? []) : [];
  const catLabel = cat === "worn" ? "Vestes" : cat === "pose" ? "Pose do desfile" : (RAIL.find((r) => r.key === cat)?.label ?? "");
  const nameOf = (id: string | undefined) => (id && !id.endsWith("_none") ? (ITEM_BY_ID.get(id)?.name ?? null) : null);
  const makeupParts = [
    "batom",
    beauty.lipStyle === "gloss" ? "gloss" : "",
    beauty.shadow ? "sombra" : "",
    beauty.liner !== "none" ? "delineado" : "",
    beauty.blush ? "blush" : "",
    beauty.lashes === "longos" || beauty.lashes === "dramaticos" ? "cílios" : "",
    ...beauty.marks.map((m) => MARKS.find((x) => x.key === m)?.label.toLowerCase() ?? ""),
  ].filter(Boolean);
  const makeupCount = makeupParts.length;
  const makeupSummary = makeupParts.length > 3 ? `${makeupParts.slice(0, 3).join(", ")} e mais ${makeupParts.length - 3}` : makeupParts.join(", ");
  const toggleMark = (m: Mark) => tweak({ marks: beauty.marks.includes(m) ? beauty.marks.filter((x) => x !== m) : [...beauty.marks, m] });
  const wornRows: { key: string; label: string; name: string | null; dot?: string; go: Cat; remove?: () => void }[] = [
    { key: "head", label: "Cabeça", name: nameOf(look.head), go: "head", remove: nameOf(look.head) ? () => equip("head", undefined) : undefined },
    { key: "hair", label: "Cabelo", name: HAIR_STYLES.find((h) => h.key === beauty.hair)?.label ?? null, dot: beauty.hairColor, go: "hair" },
    { key: "face", label: "Maquiagem", name: makeupSummary, dot: beauty.lip, go: "makeup", remove: makeupCount > 1 ? () => tweak({ shadow: null, blush: null, liner: "none", marks: [], lashes: "natural", lipStyle: "fosco" }) : undefined },
    { key: "tunic", label: "Roupa", name: nameOf(look.tunic), go: "tunic", remove: look.tunic ? () => equip("tunic", undefined) : undefined },
    { key: "mantle", label: "Manto e enfeites", name: nameOf(look.mantle), go: "mantle", remove: nameOf(look.mantle) ? () => equip("mantle", undefined) : undefined },
    { key: "shoes", label: "Calçado", name: nameOf(look.shoes), go: "shoes", remove: nameOf(look.shoes) ? () => equip("shoes", undefined) : undefined },
    { key: "hand", label: "Na mão", name: nameOf(look.hand), go: "hand", remove: nameOf(look.hand) ? () => equip("hand", undefined) : undefined },
  ];
  const wornCount = SLOTS.filter((s) => nameOf(look[s.key])).length;
  const missing = !look.tunic;

  return (
    <div className="vh-room">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dress/camarim.webp" alt="" className="vh-room-bg" draggable={false} />

      <div className="vh-room-top">
        <button type="button" className="vh-iconbtn" aria-label="Sair do camarim" onClick={exit}>
          ✕
        </button>
        <button type="button" className="vh-theme" onClick={() => setClue((c) => !c)} aria-expanded={clue}>
          <small>{isLive ? "Tema da rodada" : daily ? "Tema de hoje" : "Tema do treino"} · toque pra ver a dica</small>
          <b>{theme.name}</b>
        </button>
        {timed ? (
          <div className="vh-timer" data-low={left <= 30} role="timer" aria-label="Tempo restante">
            ⏱ {fmtClock(left)}
          </div>
        ) : (
          <div className="vh-timer !text-sm">🏋️ Treino</div>
        )}
      </div>

      {clue ? (
        <div className="vh-panel vh-pop absolute inset-x-3 top-[3.6rem] z-[5] !p-3 text-sm" role="status">
          <p className="leading-snug text-amber-50">{theme.hint}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {theme.suggestions.map((x) => (
              <li key={x} className="rounded-full border border-amber-300/60 bg-amber-100/10 px-2 py-0.5 text-[11px] font-bold text-amber-50">
                {x}
              </li>
            ))}
          </ul>
          {theme.ref ? <p className="mt-1 text-xs font-bold text-amber-300">📖 {theme.ref}</p> : null}
        </div>
      ) : null}

      <div className="vh-room-stage">
        {mall ? (
          <div className="absolute inset-0">
            <MallStore3D base={base} look={look} onEquip={equip} onStation={(c) => openPanel(c)} quiet={closetOpen} />
          </div>
        ) : null}
        {(mall ? [] : (["l", "r"] as const)).map((side) => (
          <div key={side} className="vh-rail" data-side={side}>
            {RAIL.filter((r) => r.side === side).map((r) => (
              <div key={r.key}>
                <button type="button" className="vh-medal" aria-label={r.label} data-on={cat === r.key} data-done={SLOTS.some((s) => s.key === r.key) && !!look[r.key as Slot]} onClick={() => setCat(r.key)}>
                  {r.icon}
                </button>
                <span className="vh-medal-label">{r.label}</span>
              </div>
            ))}
          </div>
        ))}
        {mall ? null : <PaperDoll base={base} look={look} title="Sua avatar" className="vh-room-doll" />}
        {burst > 0 && !mall ? <SparkleBurst key={burst} n={10} /> : null}
      </div>

      {mall && !closetOpen ? (
        <div className="vh-footer relative z-[4] px-2.5">
          <button type="button" className="vh-btn vh-btn-dark !w-auto !px-3" onClick={undo} disabled={past.length === 0} aria-label="Desfazer">
            ↩
          </button>
          <button type="button" className="vh-btn vh-btn-dark !w-auto !px-3 !text-sm" onClick={() => openPanel("worn")}>
            🧥 {wornCount}/{DRESS_ITEM_LIMIT}
          </button>
          {isLive ? (
            <button type="button" className="vh-btn vh-btn-dark !w-auto !px-3 !text-sm" onClick={() => openPanel("pose")}>
              {POSES.find((x) => x.key === pose)?.icon}
            </button>
          ) : null}
          <button type="button" className="vh-btn vh-btn-dark !w-auto !px-3 !text-sm" onClick={() => changeView("list")}>
            📋
          </button>
          <button type="button" className="vh-btn vh-btn-purple" disabled={busy || (isLive && ready)} onClick={() => void finish(false)}>
            {busy ? "..." : missing ? "👗 Escolha uma roupa" : isLive ? (ready ? "✓ PRONTA" : saved ? "ESTOU PRONTA" : "ESTOU PRONTA · salvando…") : daily ? "PRONTO · desfilar" : "PRONTO · ver a nota"}
          </button>
        </div>
      ) : null}
      {error && mall && !closetOpen ? <p className="absolute inset-x-3 bottom-16 z-[6] rounded-xl bg-rose-900/90 px-3 py-1.5 text-xs font-bold text-rose-100">{error}</p> : null}

      {!mall || closetOpen ? (
      <div className="vh-closet" data-over={mall ? "true" : undefined}>
        <div className="vh-closet-head">
          <p className="vh-h2">{catLabel}</p>
          <div className="flex items-center gap-2">
            {slotCat ? <p className="hidden text-[10px] font-bold text-purple-200 min-[380px]:block">{fams.length} peças · toque de novo pra tirar</p> : null}
            {isLive ? (
              <button type="button" className="vh-chip !px-3 !py-1 !text-[11px]" data-on={cat === "pose"} onClick={() => setCat(cat === "pose" ? "tunic" : "pose")}>
                {POSES.find((x) => x.key === pose)?.icon} Pose
              </button>
            ) : null}
            <button type="button" className="vh-chip !px-3 !py-1 !text-[11px]" data-on={cat === "worn"} onClick={() => setCat(cat === "worn" ? "tunic" : "worn")} aria-label={`Vestes: ${wornCount} de ${DRESS_ITEM_LIMIT} itens`}>
              🧥 Vestes ({wornCount}/{DRESS_ITEM_LIMIT})
            </button>
            {mall ? (
              <button type="button" className="vh-iconbtn !h-8 !w-8 !text-sm" aria-label="Voltar para a loja" onClick={() => setClosetOpen(false)}>
                ✕
              </button>
            ) : (
              <button type="button" className="vh-chip !px-3 !py-1 !text-[11px]" onClick={() => changeView("mall")}>
                🏬 Loja 3D
              </button>
            )}
          </div>
        </div>

        {slotCat && famItems.length > 1 ? (
          <div className="vh-swatches" aria-label="Cores e estilos">
            <small>Cor</small>
            {famItems.map((it) => (
              <button key={it.id} type="button" className="vh-swatch" data-on={equippedId === it.id} aria-label={it.name} title={it.name} style={{ background: it.p.c }} onClick={() => equip(slotCat, it.id)}>
                {it.p.c2 ? <i style={{ background: it.p.c2 }} /> : null}
              </button>
            ))}
          </div>
        ) : null}

        {slotCat ? (
          <div className="vh-closet-grid">
            {fams.map((f) => {
              const worn = f.items.find((i) => i.id === look[slotCat]);
              const shown = worn ?? f.items[0];
              const rare = rarityOf(f.family);
              return (
                <button key={f.family} type="button" className="vh-tile" data-on={!!worn} data-rare={rare === "common" ? undefined : rare} onClick={() => equip(slotCat, worn ? undefined : shown.id)} aria-pressed={!!worn}>
                  {rare !== "common" ? <em className="vh-tile-x not-italic">{RARITY_ICON[rare]}</em> : null}
                  <PaperDoll base={base} look={{ [slotCat]: shown.id }} only={slotCat} className="h-14 w-full" title={f.base} />
                  <span>{f.base}</span>
                </button>
              );
            })}
          </div>
        ) : cat === "pose" ? (
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            <p className="mb-2 text-[11px] font-bold text-purple-200">Como a sua modelo para no fim da passarela.</p>
            <div className="grid grid-cols-3 gap-2">
              {POSES.map((x) => (
                <button key={x.key} type="button" className="vh-chip !flex-col !gap-0.5 !py-2" data-on={pose === x.key} aria-pressed={pose === x.key} onClick={() => pickPose(x.key)}>
                  <span className="text-xl" aria-hidden>
                    {x.icon}
                  </span>
                  {x.label}
                </button>
              ))}
            </div>
          </div>
        ) : cat === "worn" ? (
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pb-2" aria-label="Peças vestidas">
            {wornRows.map((r) => (
              <li key={r.key} className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-white/5 px-2.5 py-1.5">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setCat(r.go)}>
                  <span className="block text-[10px] font-black uppercase tracking-wide text-amber-200">{r.label}</span>
                  <span className="block truncate text-sm font-bold text-amber-50">
                    {r.dot ? <i className="mr-1.5 inline-block h-3 w-3 rounded-full border border-white/60 align-middle" style={{ background: r.dot }} /> : null}
                    {r.name ?? "—"}
                  </span>
                </button>
                {r.remove ? (
                  <button type="button" className="vh-iconbtn !h-8 !w-8 !text-sm" aria-label={`Tirar ${r.label}`} onClick={r.remove}>
                    ✕
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
            {cat === "hair" ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {HAIR_STYLES.map((h) => (
                    <button key={h.key} type="button" className="vh-chip" data-on={beauty.hair === h.key} onClick={() => tweak({ hair: h.key })}>
                      {h.emoji} {h.label}
                    </button>
                  ))}
                </div>
                <Swatches label="Cor do cabelo" colors={HAIR_COLORS} value={beauty.hairColor} onPick={(c) => c && tweak({ hairColor: c })} />
              </>
            ) : null}
            {cat === "makeup" ? (
              <>
                <Swatches label="Batom" colors={LIPS} value={beauty.lip} onPick={(c) => c && tweak({ lip: c })} />
                <Chips label="Acabamento do batom" options={LIP_STYLES} value={beauty.lipStyle} onPick={(v) => tweak({ lipStyle: v })} />
                <Swatches label="Sombra" colors={SHADOWS} value={beauty.shadow} onPick={(c) => tweak({ shadow: c })} />
                <Chips label="Delineado" options={LINER_STYLES} value={beauty.liner} onPick={(v) => tweak({ liner: v })} />
                {beauty.liner !== "none" ? <Swatches label="Cor do delineado" colors={LINER_COLORS} value={beauty.linerColor} onPick={(c) => c && tweak({ linerColor: c })} /> : null}
                <Chips label="Cílios" options={LASH_STYLES} value={beauty.lashes} onPick={(v) => tweak({ lashes: v })} />
                <Swatches label="Blush" colors={BLUSHES} value={beauty.blush} onPick={(c) => tweak({ blush: c })} />
                <Swatches label="Cor dos olhos" colors={EYE_COLORS} value={beauty.eye} onPick={(c) => c && tweak({ eye: c })} />
                <Chips label="Sobrancelhas" options={BROW_STYLES} value={beauty.brows} onPick={(v) => tweak({ brows: v })} />
                <Swatches label="Cor das sobrancelhas (✕ = igual ao cabelo)" colors={BROW_COLORS} value={beauty.browColor} onPick={(c) => tweak({ browColor: c })} />
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-amber-200">Detalhes no rosto</p>
                  <div className="flex flex-wrap gap-2">
                    {MARKS.map((m) => (
                      <button key={m.key} type="button" className="vh-chip" data-on={beauty.marks.includes(m.key)} aria-pressed={beauty.marks.includes(m.key)} onClick={() => toggleMark(m.key)}>
                        {m.icon} {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            {cat === "skin" ? <Swatches label="Tom de pele" colors={SKINS} value={beauty.skin} onPick={(c) => c && tweak({ skin: c })} /> : null}
          </div>
        )}

        {error ? <p className="mb-1 rounded-xl bg-rose-900/80 px-3 py-1.5 text-xs font-bold text-rose-100">{error}</p> : null}
        <div className="vh-footer">
          <button type="button" className="vh-btn vh-btn-dark !w-auto !px-3" onClick={undo} disabled={past.length === 0} aria-label="Desfazer">
            ↩
          </button>
          <button type="button" className="vh-btn vh-btn-dark !w-auto !px-3" onClick={redo} disabled={future.length === 0} aria-label="Refazer">
            ↪
          </button>
          <button type="button" className="vh-btn vh-btn-dark !w-auto !px-3" onClick={() => change({})} aria-label="Tirar todas as peças">
            🗑
          </button>
          <button type="button" className="vh-btn vh-btn-purple" disabled={busy || (isLive && ready)} onClick={() => void finish(false)}>
            {busy ? "..." : missing ? "👗 Escolha uma roupa" : isLive ? (ready ? "✓ PRONTA · aguardando as outras" : saved ? "ESTOU PRONTA" : "ESTOU PRONTA · salvando…") : daily ? "PRONTO · desfilar" : "PRONTO · ver a nota"}
          </button>
        </div>
      </div>
      ) : null}
    </div>
  );
}

function Chips<T extends string>({ label, options, value, onPick }: { label: string; options: { key: T; label: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-amber-200">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.key} type="button" className="vh-chip" data-on={value === o.key} aria-pressed={value === o.key} onClick={() => onPick(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches({ label, colors, value, onPick }: { label: string; colors: (string | null)[]; value: string | null; onPick: (c: string | null) => void }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-amber-200">{label}</p>
      <div className="vh-swatches !p-1">
        {colors.map((c) => (
          <button key={c ?? "none"} type="button" className="vh-swatch" data-on={value === c} aria-label={c ?? "Nenhuma"} style={{ background: c ?? "#f4efe2" }} onClick={() => onPick(c)}>
            {c === null ? <span className="grid h-full w-full place-items-center text-sm font-black text-rose-600">✕</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
