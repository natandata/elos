"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PaperDoll } from "./PaperDoll";
import { RunwayWalk } from "./RunwayWalk";
import { StarsStatic } from "./Stars";
import { RARITY_ICON, SparkleBurst, Sparkles, rarityOf } from "./Vh";
import { judgePractice, submitRunwayLook, type JuryResult, type PublishResult } from "@/lib/actions/runway";
import { DEFAULT_BEAUTY, HAIR_COLORS, HAIR_STYLES, LIPS, SHADOWS, SKINS, baseFromBeauty, type Beauty } from "@/lib/games/dress/beauty";
import { ITEM_BY_ID, SLOTS, familiesBySlot, type Look, type Slot } from "@/lib/games/dress/items";
import { fmtClock } from "@/lib/games/dress/rules";
import type { BibleTheme } from "@/lib/games/dress/themes";

type Cat = "hair" | "makeup" | "skin" | "worn" | Slot;
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
export function Camarim({ theme, mode, msLeft, practiceN = 1, draftKey, exitHref }: { theme: BibleTheme; mode: "daily" | "practice"; msLeft?: number; practiceN?: number; draftKey: string; exitHref: string }) {
  const router = useRouter();
  const daily = mode === "daily";
  const [look, setLook] = useState<Look>({});
  const [beauty, setBeauty] = useState<Beauty>(DEFAULT_BEAUTY);
  const [cat, setCat] = useState<Cat>("tunic");
  const [left, setLeft] = useState(daily ? Math.max(0, (msLeft ?? 0) / 1000) : 0);
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
      setLook(store<Look>(draftKey, {}));
      setBeauty({ ...DEFAULT_BEAUTY, ...store<Partial<Beauty>>("vh:beauty", {}) });
    }, 0);
    return () => clearTimeout(t);
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
    [look, beauty, daily, practiceN, draftKey],
  );

  useEffect(() => {
    if (!daily || done) return;
    const id = setInterval(() => {
      const s = Math.max(0, (deadline.current - Date.now()) / 1000);
      setLeft(s);
      if (s <= 0) void finish(true);
    }, 250);
    return () => clearInterval(id);
  }, [daily, done, finish]);

  function remember() {
    setPast((p) => [...p.slice(-39), { look, beauty }]);
    setFuture([]);
  }
  function change(next: Look) {
    remember();
    setLook(next);
    save(draftKey, next);
    setBurst((b) => b + 1);
  }
  const equip = (slot: Slot, id: string | undefined) => change({ ...look, [slot]: id });
  const tweak = (patch: Partial<Beauty>) => {
    remember();
    setBeauty((b) => ({ ...b, ...patch }));
    setBurst((b) => b + 1);
  };
  function undo() {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast(past.slice(0, -1));
    setFuture((f) => [...f, { look, beauty }]);
    setLook(prev.look);
    setBeauty(prev.beauty);
    save(draftKey, prev.look);
  }
  function redo() {
    const next = future[future.length - 1];
    if (!next) return;
    setFuture(future.slice(0, -1));
    setPast((p) => [...p, { look, beauty }]);
    setLook(next.look);
    setBeauty(next.beauty);
    save(draftKey, next.look);
  }
  const exit = () => {
    if (daily && !window.confirm("Sair do camarim? O tempo continua correndo.")) return;
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
  const catLabel = cat === "worn" ? "Vestes" : (RAIL.find((r) => r.key === cat)?.label ?? "");
  const nameOf = (id: string | undefined) => (id && !id.endsWith("_none") ? (ITEM_BY_ID.get(id)?.name ?? null) : null);
  const wornRows: { key: string; label: string; name: string | null; dot?: string; go: Cat; remove?: () => void }[] = [
    { key: "head", label: "Cabeça", name: nameOf(look.head), go: "head", remove: nameOf(look.head) ? () => equip("head", undefined) : undefined },
    { key: "hair", label: "Cabelo", name: HAIR_STYLES.find((h) => h.key === beauty.hair)?.label ?? null, dot: beauty.hairColor, go: "hair" },
    { key: "face", label: "Rosto", name: beauty.shadow ? "Batom e sombra" : "Batom", dot: beauty.lip, go: "makeup", remove: beauty.shadow ? () => tweak({ shadow: null }) : undefined },
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
          <small>{daily ? "Tema de hoje" : "Tema do treino"} · toque pra ver a dica</small>
          <b>{theme.name}</b>
        </button>
        {daily ? (
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
        {(["l", "r"] as const).map((side) => (
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
        <PaperDoll base={base} look={look} title="Sua avatar" className="vh-room-doll" />
        {burst > 0 ? <SparkleBurst key={burst} n={10} /> : null}
      </div>

      <div className="vh-closet">
        <div className="vh-closet-head">
          <p className="vh-h2">{catLabel}</p>
          <div className="flex items-center gap-2">
            {slotCat ? <p className="hidden text-[10px] font-bold text-purple-200 min-[380px]:block">{fams.length} peças · toque de novo pra tirar</p> : null}
            <button type="button" className="vh-chip !px-3 !py-1 !text-[11px]" data-on={cat === "worn"} onClick={() => setCat(cat === "worn" ? "tunic" : "worn")}>
              🧥 Vestes ({wornCount})
            </button>
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
                <div className="flex gap-2">
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
                <Swatches label="Sombra" colors={SHADOWS} value={beauty.shadow} onPick={(c) => tweak({ shadow: c })} />
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
          <button type="button" className="vh-btn vh-btn-purple" disabled={busy} onClick={() => void finish(false)}>
            {busy ? "..." : missing ? "👗 Escolha uma roupa" : daily ? "PRONTO · desfilar" : "PRONTO · ver a nota"}
          </button>
        </div>
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
