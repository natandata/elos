"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BEAUTY, baseFromBeauty, cleanBeauty } from "@/lib/games/dress/beauty";
import { cleanChat, type ChatMsg, type HallPos, type HallRoster } from "@/lib/games/dress/hall";
import { ITEM_BY_ID, type Look, type Slot } from "@/lib/games/dress/items";
import { RARITY_ICON, rarityOf } from "@/lib/games/dress/rarity";
import { FLOOR_INFO, FOODS, GIFT_DAILY_MAX, MALL_NAME, RESTAURANTS, offerItem, storeById, storesSelling, type RareOffer } from "@/lib/games/dress/shopping";
import { createClient } from "@/lib/supabase/client";
import { SIcon, ST } from "./ShopIcons";
import { ChatFeed, ChatToggle, useHallChat } from "./HallChat";
import type { Interact } from "./mallScene";
import { PaperDoll } from "./PaperDoll";
import { SoundToggle } from "./Sound";
import type { GotoTarget, WorldPlace, WorldPos } from "./ShoppingWorld3D";

const ShoppingWorld3D = dynamic(() => import("./ShoppingWorld3D").then((m) => m.ShoppingWorld3D), {
  ssr: false,
  loading: () => <p className="grid h-full place-items-center text-sm font-black text-purple-900">Abrindo o shopping…</p>,
});

type Who = { id: string; name: string; look: Look; beauty: unknown };
type PosMsg = WorldPos & { id: string };
type Player = { user_id: string; full_name: string };

/** Última aparência que a jogadora montou num camarim. */
function lastLook(): { look: Look; beauty: unknown } {
  try {
    const raw = localStorage.getItem("vh:last");
    if (raw) return JSON.parse(raw) as { look: Look; beauty: unknown };
  } catch {
    /* sem aparência salva */
  }
  return { look: {}, beauty: DEFAULT_BEAUTY };
}

const countdown = (iso: string, now: number): string => {
  const s = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

type Dialog =
  | { kind: "item"; itemId: string }
  | { kind: "rare"; offerId: number }
  | { kind: "food"; place: string }
  | { kind: "booth" }
  | { kind: "elevator" }
  | { kind: "info" }
  | null;

/**
 * Shopping Elos: o mundo aberto online do Vista o Herói (5 andares, lojas, praça de alimentação e cabine de bilhetes).
 * Aqui só ficam a rede (posições e chat), as compras e as janelas; o 3D está em ShoppingWorld3D.
 */
export function MadureiraClient({ meId, meName, tickets, owned: ownedInit }: { meId: string; meName: string; tickets: number; owned: string[] }) {
  const router = useRouter();
  const sb = useMemo(() => createClient(), []);
  const mine = useMemo(() => lastLook(), []);
  const base = useMemo(() => baseFromBeauty(cleanBeauty(mine.beauty)), [mine]);
  const [look, setLook] = useState<Look>({ tunic: "tunic_simple", ...mine.look });
  const [place, setPlace] = useState<WorldPlace>({ kind: "mall" });
  const [nonce, setNonce] = useState(0);
  const [wallet, setWallet] = useState(tickets);
  const [owned, setOwned] = useState<Set<string>>(() => new Set(ownedInit));
  const [offers, setOffers] = useState<RareOffer[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [floor, setFloor] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [sentToday, setSentToday] = useState(0);
  const [loadingTo, setLoadingTo] = useState<{ title: string; icon: string; color: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  // ---- rede: posições, quem está no shopping e chat
  const positions = useRef<Record<string, HallPos>>({});
  const rosterMap = useRef<Map<string, HallRoster>>(new Map());
  const [roster, setRoster] = useState<HallRoster[]>([]);
  const chRef = useRef<ReturnType<typeof sb.channel> | null>(null);
  const lastWho = useRef(0);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const hc = useHallChat(chat);
  const lookRef = useRef(look);
  useEffect(() => {
    lookRef.current = look;
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __madu?: unknown }).__madu = { positions, rosterMap, setRoster };
  }, []);

  useEffect(() => {
    const ch = sb.channel("madureira:mall", { config: { broadcast: { self: false } } });
    const sendWho = () => {
      lastWho.current = Date.now();
      void ch.send({ type: "broadcast", event: "who", payload: { id: meId, name: meName, look: lookRef.current, beauty: mine.beauty } satisfies Who });
    };
    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      const m = payload as PosMsg;
      if (!m?.id || m.id === meId) return;
      positions.current[m.id] = { x: m.x, z: m.z, fx: m.fx === -1 ? -1 : 1, mv: m.mv, t: Date.now(), y: m.y, s: m.s, w: m.w, e: m.e };
      if (!rosterMap.current.has(m.id) && Date.now() - lastWho.current > 2000) sendWho();
    });
    ch.on("broadcast", { event: "who" }, ({ payload }) => {
      const w = payload as Who;
      if (!w?.id || w.id === meId) return;
      const prev = rosterMap.current.get(w.id);
      if (prev && JSON.stringify([prev.look, prev.beauty]) === JSON.stringify([w.look, w.beauty])) return;
      rosterMap.current.set(w.id, { id: w.id, name: String(w.name ?? "").slice(0, 30), look: w.look ?? {}, beauty: w.beauty });
      setRoster([...rosterMap.current.values()].slice(0, 24));
      if (Date.now() - lastWho.current > 2000) sendWho();
    });
    ch.on("broadcast", { event: "chat" }, ({ payload }) => {
      const m = payload as ChatMsg;
      if (!m?.id || m.id === meId || typeof m.text !== "string") return;
      setChat((c) => [...c.slice(-39), { id: m.id, name: String(m.name ?? "").slice(0, 30), text: cleanChat(m.text) }]);
    });
    ch.on("broadcast", { event: "gift" }, ({ payload }) => {
      const g = payload as { to?: string; from?: string; amount?: number };
      if (g?.to !== meId || !g.amount) return;
      setWallet((w) => w + Number(g.amount));
      say(`🎁 ${String(g.from ?? "Alguém").slice(0, 20)} doou ${g.amount} bilhete${g.amount === 1 ? "" : "s"} para você!`);
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") sendWho();
    });
    chRef.current = ch;
    const again = setInterval(sendWho, 12000);
    const sweep = setInterval(() => {
      const t = Date.now();
      let changed = false;
      for (const [id, p] of Object.entries(positions.current)) {
        if (t - p.t > 20000) {
          delete positions.current[id];
          rosterMap.current.delete(id);
          changed = true;
        }
      }
      if (changed) setRoster([...rosterMap.current.values()].slice(0, 24));
    }, 5000);
    return () => {
      clearInterval(again);
      clearInterval(sweep);
      chRef.current = null;
      void sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb, meId, meName, mine]);

  // quem já me conhece vê a roupa nova quando eu provo algo
  useEffect(() => {
    const t = setTimeout(() => {
      void chRef.current?.send({ type: "broadcast", event: "who", payload: { id: meId, name: meName, look, beauty: mine.beauty } satisfies Who });
    }, 600);
    return () => clearTimeout(t);
  }, [look, meId, meName, mine]);

  const sendPos = useCallback(
    (p: WorldPos) => {
      void chRef.current?.send({ type: "broadcast", event: "pos", payload: { id: meId, x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: p.y, fx: p.fx, mv: +p.mv.toFixed(2), s: p.s, e: p.e, w: p.w } satisfies PosMsg });
    },
    [meId],
  );
  const sendChat = (text: string) => {
    const t = cleanChat(text);
    if (!t) return;
    setChat((c) => [...c.slice(-39), { id: meId, name: "Você", text: t }]);
    void chRef.current?.send({ type: "broadcast", event: "chat", payload: { id: meId, name: meName.split(" ")[0], text: t } satisfies ChatMsg });
  };

  // ---- dados do banco: ofertas raras, saldo, doações recebidas
  const loadOffers = useCallback(async () => {
    const { data } = await sb.rpc("mall_rare_offers");
    if (Array.isArray(data)) setOffers(data as RareOffer[]);
  }, [sb]);
  useEffect(() => {
    const t0 = setTimeout(() => void loadOffers(), 0);
    const t = setInterval(() => void loadOffers(), 45000);
    const c = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
      clearInterval(c);
    };
  }, [loadOffers]);
  useEffect(() => {
    let alive = true;
    void sb.rpc("mall_gift_status").then(({ data }) => {
      if (!alive || !data) return;
      const d = data as { sent_today?: number; tickets?: number; unseen?: { amount: number; from: string }[] };
      setSentToday(d.sent_today ?? 0);
      if (typeof d.tickets === "number") setWallet(d.tickets);
      if (d.unseen?.length) {
        say(`🎁 Você recebeu: ${d.unseen.map((g) => `${g.amount} de ${g.from}`).join(", ")}!`);
        void sb.rpc("mall_gifts_seen");
      }
    });
    return () => {
      alive = false;
    };
  }, [sb, say]);

  const gotoRef = useRef<((t: GotoTarget) => void) | null>(null);
  const eatRef = useRef<((emoji: string, sec: number) => void) | null>(null);
  const warpRef = useRef<((floor: number) => void) | null>(null);

  // ao entrar ou sair de uma loja aparece uma tela de carregamento de 2 segundos
  const withLoading = (title: string, icon: string, color: number, go: () => void) => {
    setLoadingTo({ title, icon, color });
    setDialog(null);
    setTimeout(go, 250);
    setTimeout(() => setLoadingTo(null), 2000);
  };
  const rideElevator = (f: number) => {
    setDialog(null);
    setLoadingTo({ title: `Elevador · ${FLOOR_INFO[f]?.name}`, icon: "escada", color: 0x2a4a8a });
    setTimeout(() => warpRef.current?.(f), 1000);
    setTimeout(() => setLoadingTo(null), 2000);
  };
  const enterStore = (id: string) => {
    const def = storeById(id);
    withLoading(def?.name ?? "Loja", def?.icon ?? "sacola", def?.accent ?? 0x5b1f78, () => {
      setPlace({ kind: "store", id });
      setNonce((n) => n + 1);
      void loadOffers();
    });
  };
  const leaveStore = () => {
    withLoading(MALL_NAME, "sacola", 0x5b1f78, () => {
      setPlace({ kind: "mall" });
      setNonce((n) => n + 1);
    });
  };

  const onAct = (i: Interact) => {
    setMsg(null);
    if (i.kind === "door") enterStore(i.store);
    else if (i.kind === "exit") leaveStore();
    else if (i.kind === "mallexit") router.push("/app/jogos/vestir");
    else if (i.kind === "closed") say("Essa loja ainda está em reforma. Volte em breve!");
    else if (i.kind === "counter") setDialog({ kind: "food", place: i.place });
    else if (i.kind === "elevator") setDialog({ kind: "elevator" });
    else if (i.kind === "booth") {
      setDialog({ kind: "booth" });
    } else if (i.kind === "info") {
      void loadOffers();
      setDialog({ kind: "info" });
    } else if (i.kind === "item") setDialog({ kind: "item", itemId: i.itemId });
    else if (i.kind === "rare") setDialog({ kind: "rare", offerId: i.offerId });
  };

  // ---- compras
  async function buyFamily(family: string) {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb.rpc("dress_buy_family", { p_family: family });
    setBusy(false);
    const r = (data ?? {}) as { error?: string; tickets?: number };
    if (error || r.error) return setMsg(r.error ?? "Não foi possível comprar. Tente de novo.");
    setOwned((o) => new Set(o).add(family));
    if (typeof r.tickets === "number") setWallet(r.tickets);
    say("🛍 Comprou! A peça já está no seu guarda-roupa.");
  }
  async function buyRare(o: RareOffer) {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb.rpc("mall_buy_rare", { p_drop: o.id });
    setBusy(false);
    const r = (data ?? {}) as { error?: string; tickets?: number; family?: string };
    if (error || r.error) {
      void loadOffers();
      return setMsg(r.error ?? "Não foi possível comprar. Tente de novo.");
    }
    setOwned((s) => new Set(s).add(o.family));
    if (typeof r.tickets === "number") setWallet(r.tickets);
    void loadOffers();
    say("🔥 Peça rara sua! Ela fica no guarda-roupa para sempre.");
  }
  async function buyFood(key: string) {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb.rpc("mall_buy_food", { p_key: key });
    setBusy(false);
    const r = (data ?? {}) as { error?: string; tickets?: number; seconds?: number };
    if (error || r.error) return setMsg(r.error ?? "Não foi possível comprar. Tente de novo.");
    if (typeof r.tickets === "number") setWallet(r.tickets);
    const f = FOODS.find((x) => x.key === key);
    setDialog(null);
    if (f) {
      eatRef.current?.(f.icon, r.seconds ?? f.seconds);
      say("Bom apetite! Sente numa mesa 🪑 para comer com calma.");
    }
  }

  // ---- janelas
  const dlg = (() => {
    if (!dialog) return null;
    if (dialog.kind === "item") {
      const it = ITEM_BY_ID.get(dialog.itemId);
      if (!it) return null;
      const rar = rarityOf(it.family);
      const price = rar === "legend" ? 150 : 60;
      const has = owned.has(it.family);
      const wearing = look[it.slot as Slot] === it.id;
      return (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={it.name}>
          <div className="vh-panel flex max-h-[92vh] w-full max-w-sm flex-col overflow-y-auto text-center">
            <PaperDoll base={base} look={{ [it.slot]: it.id }} only={it.slot as Slot} className="mx-auto h-24 w-full shrink-0" title={it.name} />
            <p className="vh-title mt-1 text-xl">{it.name}</p>
            <p className="text-sm text-purple-100">
              <ST>Peça {rar === "legend" ? "lendária ⭐" : "épica 💜"}. {has ? "Você já tem essa peça: ela vale em todas as cores." : "Ao comprar, vale em todas as cores e fica para sempre no guarda-roupa."}</ST>
            </p>
            <p className="mt-2 text-lg font-black text-amber-200">
              <ST>{has ? "✔ Já é sua" : `${price} 🎫`}</ST> <span className="text-xs font-bold text-purple-200">· você tem {wallet}</span>
            </p>
            {msg ? <p className="mt-1 text-sm font-bold text-rose-200">{msg}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="vh-btn vh-btn-dark" onClick={() => setLook((l) => ({ ...l, [it.slot]: wearing ? undefined : it.id }))}>
                <ST>{wearing ? "👗 Tirar" : "👗 Provar"}</ST>
              </button>
              {has ? (
                <button type="button" className="vh-btn" onClick={() => setDialog(null)}>
                  Continuar
                </button>
              ) : (
                <button type="button" className="vh-btn" onClick={() => void buyFamily(it.family)} disabled={busy || wallet < price}>
                  <ST>{busy ? "..." : wallet < price ? `Faltam ${price - wallet} 🎫` : "Comprar"}</ST>
                </button>
              )}
            </div>
            <button type="button" className="vh-btn vh-btn-dark mt-2" onClick={() => setDialog(null)}>
              Fechar
            </button>
          </div>
        </div>
      );
    }
    if (dialog.kind === "rare") {
      const o = offers.find((x) => x.id === dialog.offerId);
      const it = o ? offerItem(o.family) : undefined;
      if (!o || !it) return null;
      const has = owned.has(o.family) || o.mine;
      const wearing = look[it.slot as Slot] === it.id;
      const over = new Date(o.ends_at).getTime() <= now;
      return (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={it.name}>
          <div className="vh-panel flex max-h-[92vh] w-full max-w-sm flex-col overflow-y-auto text-center">
            <PaperDoll base={base} look={{ [it.slot]: it.id }} only={it.slot as Slot} className="mx-auto h-28 w-full shrink-0" title={it.name} />
            <p className="vh-title mt-1 text-xl">
              {RARITY_ICON.limited} {it.name}
            </p>
            <p className="text-sm text-purple-100">Edição limitada: só 3 unidades, por 24 horas, no shopping inteiro.</p>
            <p className="mt-1 text-sm font-black text-amber-100">
              {o.left > 0 ? `Restam ${o.left} de ${o.stock}` : "Esgotada"} · termina em {countdown(o.ends_at, now)}
            </p>
            <p className="mt-2 text-lg font-black text-amber-200">
              <ST>{has ? "✔ Já é sua" : `${o.price} 🎫`}</ST> <span className="text-xs font-bold text-purple-200">· você tem {wallet}</span>
            </p>
            {msg ? <p className="mt-1 text-sm font-bold text-rose-200">{msg}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="vh-btn vh-btn-dark" onClick={() => setLook((l) => ({ ...l, [it.slot]: wearing ? undefined : it.id }))}>
                <ST>{wearing ? "👗 Tirar" : "👗 Provar"}</ST>
              </button>
              {has ? (
                <button type="button" className="vh-btn" onClick={() => setDialog(null)}>
                  Continuar
                </button>
              ) : (
                <button type="button" className="vh-btn" onClick={() => void buyRare(o)} disabled={busy || o.left <= 0 || over || wallet < o.price}>
                  <ST>{busy ? "..." : o.left <= 0 ? "Esgotada" : over ? "Terminou" : wallet < o.price ? `Faltam ${o.price - wallet} 🎫` : "Comprar"}</ST>
                </button>
              )}
            </div>
            <button type="button" className="vh-btn vh-btn-dark mt-2" onClick={() => setDialog(null)}>
              Fechar
            </button>
          </div>
        </div>
      );
    }
    if (dialog.kind === "food") {
      const r = RESTAURANTS.find((x) => x.key === dialog.place);
      if (!r) return null;
      return (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={r.name}>
          <div className="vh-panel flex max-h-[92vh] w-full max-w-sm flex-col text-center">
            <p className="vh-title text-xl">
              <SIcon name={r.icon} size="1.5em" /> {r.name}
            </p>
            <p className="text-xs italic text-purple-100">{r.cook}: “{r.line}”</p>
            <p className="mt-1 text-sm font-black text-amber-200">
              <ST>Você tem {wallet} 🎫</ST>
            </p>
            {msg ? <p className="mt-1 text-sm font-bold text-rose-200">{msg}</p> : null}
            <ul className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {FOODS.filter((f) => f.place === r.key).map((f) => (
                <li key={f.key} className="flex items-center gap-2 rounded-xl border border-amber-300/40 bg-white/5 px-2.5 py-1.5 text-left">
                  <SIcon name={f.icon} size="2.2rem" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-amber-50">{f.name}</span>
                  <button type="button" className="vh-btn !w-auto !px-3 !py-1.5 !text-xs" disabled={busy || wallet < f.price} onClick={() => void buyFood(f.key)}>
                    <ST>{f.price} 🎫</ST>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="vh-btn vh-btn-dark mt-3" onClick={() => setDialog(null)}>
              Fechar
            </button>
          </div>
        </div>
      );
    }
    if (dialog.kind === "info") {
      return (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Peças raras de hoje">
          <div className="vh-panel flex max-h-[92vh] w-full max-w-sm flex-col text-center">
            <p className="vh-title text-xl"><ST>🔥 Peças raras de hoje</ST></p>
            <p className="text-xs text-purple-100">3 unidades de cada, por 24 horas. As atendentes das lojas também avisam!</p>
            <ul className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto text-left">
              {offers.map((o) => {
                const it = offerItem(o.family);
                const st = it ? storesSelling(it.slot as Slot)[0] : undefined;
                return (
                  <li key={o.id} className="rounded-xl border border-amber-300/40 bg-white/5 px-2.5 py-2">
                    <p className="text-sm font-black text-amber-100">
                      <ST>{it?.name ?? o.family} · {o.price} 🎫</ST>
                    </p>
                    <p className="text-[11px] font-bold text-purple-100">
                      <ST>{o.mine || owned.has(o.family) ? "✔ Já é sua" : o.left > 0 ? `Restam ${o.left} de ${o.stock}` : "Esgotada"} · termina em {countdown(o.ends_at, now)}</ST>
                    </p>
                    {st ? (
                      <button
                        type="button"
                        className="vh-chip mt-1 !px-2.5 !py-1 !text-[11px]"
                        onClick={() => {
                          setDialog(null);
                          gotoRef.current?.({ kind: "store", id: st.id });
                        }}
                      >
                        <SIcon name="bussola" /> {st.name} ({st.floor === 0 ? "térreo" : `${st.floor}º andar`})
                      </button>
                    ) : null}
                  </li>
                );
              })}
              {offers.length === 0 ? <li className="text-center text-sm text-purple-100">Carregando as ofertas…</li> : null}
            </ul>
            <button type="button" className="vh-btn vh-btn-dark mt-3" onClick={() => setDialog(null)}>
              Fechar
            </button>
          </div>
        </div>
      );
    }
    if (dialog.kind === "elevator") {
      return (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Elevador">
          <div className="vh-panel flex max-h-[92vh] w-full max-w-xs flex-col text-center">
            <p className="vh-title text-xl">
              <SIcon name="escada" size="1.4em" /> Elevador
            </p>
            <p className="text-xs text-purple-100">Para qual andar você quer ir?</p>
            <ul className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {[...FLOOR_INFO].map((f, i) => ({ f, i })).reverse().map(({ f, i }) => (
                <li key={f.name}>
                  <button type="button" className="vh-btn !py-2 !text-sm" data-on={i === floor} disabled={i === floor} onClick={() => rideElevator(i)}>
                    <SIcon name={i === 4 ? "talheres" : "sacola"} /> {f.name} · {f.sub}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="vh-btn vh-btn-dark mt-3" onClick={() => setDialog(null)}>
              Fechar
            </button>
          </div>
        </div>
      );
    }
    if (dialog.kind === "booth") {
      return (
        <BoothDialog
          meId={meId}
          wallet={wallet}
          sent={sentToday}
          online={roster}
          onClose={() => setDialog(null)}
          onGift={(to, name, amount, total, sentNow) => {
            setWallet(total);
            setSentToday(sentNow);
            void chRef.current?.send({ type: "broadcast", event: "gift", payload: { to, from: meName.split(" ")[0], amount } });
            say(`🎁 Você doou ${amount} bilhete${amount === 1 ? "" : "s"} para ${name}!`);
          }}
        />
      );
    }
    return null;
  })();

  const store = place.kind === "store" ? storeById(place.id) : undefined;

  return (
    <div className="vh-room" data-mall="1">
      <div className="vh-room-3d">
        <ShoppingWorld3D
          base={base}
          look={look}
          place={place}
          placeNonce={nonce}
          roster={roster}
          positions={positions}
          offers={offers}
          owned={owned}
          onPos={sendPos}
          onNear={() => undefined}
          onAct={onAct}
          onFloor={setFloor}
          gotoRef={gotoRef}
          eatRef={eatRef}
          warpRef={warpRef}
          say={say}
          leftSlot={
            <span className="vh-chip shrink-0 !px-3 !py-1.5 !text-xs" data-on>
              <SIcon name="dupla" /> {roster.length + 1}
            </span>
          }
          leftBelow={<ChatFeed recent={hc.recent} />}
        />
      </div>
      <div className="vh-room-top">
        <button type="button" className="vh-iconbtn" aria-label={store ? "Sair da loja" : "Sair do shopping"} onClick={() => (store ? leaveStore() : router.push("/app/jogos/vestir"))}>
          <SIcon name="x" />
        </button>
        <div className="vh-theme">
          <small>{store ? MALL_NAME : `${FLOOR_INFO[floor]?.name} · ${FLOOR_INFO[floor]?.sub}`}</small>
          <b>{store ? store.name : <ST>{`🛍 ${MALL_NAME}`}</ST>}</b>
        </div>
        <SoundToggle />
        <ChatToggle open={hc.open} setOpen={hc.setOpen} unread={hc.unread} onSend={sendChat} />
        <div className="vh-timer" role="status" aria-label="Seus bilhetes dourados">
          <ST>🎫 {wallet}</ST>
        </div>
      </div>
      {loadingTo ? (
        <div className="absolute inset-0 z-[90] grid place-items-center bg-[#2a0f45] text-center" role="status" aria-live="polite" style={{ background: `radial-gradient(circle at 50% 40%, #${loadingTo.color.toString(16).padStart(6, "0")} 0%, #2a0f45 75%)` }}>
          <div>
            <SIcon name={loadingTo.icon} size="5rem" />
            <p className="vh-title mt-2 text-2xl">{loadingTo.title}</p>
            <p className="mt-1 text-sm font-bold text-purple-100">Carregando…</p>
            <div className="mx-auto mt-3 h-2 w-48 overflow-hidden rounded-full bg-black/40">
              <div className="h-full rounded-full bg-amber-300" style={{ animation: "mall-load 2s linear forwards" }} />
            </div>
          </div>
        </div>
      ) : null}
      {toast ? (
        <p className="pointer-events-none absolute right-2 top-[3.9rem] z-[8] max-w-[min(16rem,45%)] rounded-xl bg-purple-900/92 px-3 py-2 text-right text-xs font-bold text-white" role="status">
          <ST>{toast}</ST>
        </p>
      ) : null}
      {dlg}
    </div>
  );
}

/** Cabine de bilhetes: doar bilhetes dourados para outra jogadora (até 30 por dia). */
function BoothDialog({
  meId,
  wallet,
  sent,
  online,
  onClose,
  onGift,
}: {
  meId: string;
  wallet: number;
  sent: number;
  online: HallRoster[];
  onClose: () => void;
  onGift: (to: string, name: string, amount: number, total: number, sentNow: number) => void;
}) {
  const sb = useMemo(() => createClient(), []);
  const [players, setPlayers] = useState<Player[]>([]);
  const [q, setQ] = useState("");
  const [to, setTo] = useState<Player | null>(null);
  const left = Math.max(0, GIFT_DAILY_MAX - sent);
  const [amount, setAmount] = useState(Math.min(5, left || 1));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void sb.rpc("dress_ticket_ranking", { p_limit: 100 }).then(({ data }) => {
      if (alive && Array.isArray(data)) setPlayers((data as Player[]).filter((p) => p.user_id !== meId));
    });
    return () => {
      alive = false;
    };
  }, [sb, meId]);
  const list = useMemo(() => {
    const seen = new Set<string>();
    const out: (Player & { here: boolean })[] = [];
    for (const r of online) {
      seen.add(r.id);
      out.push({ user_id: r.id, full_name: r.name, here: true });
    }
    for (const p of players) if (!seen.has(p.user_id)) out.push({ ...p, here: false });
    const n = q.trim().toLowerCase();
    return n ? out.filter((p) => p.full_name.toLowerCase().includes(n)) : out;
  }, [online, players, q]);
  const max = Math.max(0, Math.min(left, wallet));

  async function go() {
    if (!to || busy) return;
    setBusy(true);
    setErr(null);
    const { data, error } = await sb.rpc("mall_gift_tickets", { p_to: to.user_id, p_amount: amount });
    setBusy(false);
    const r = (data ?? {}) as { error?: string; tickets?: number; sent_today?: number; to?: string };
    if (error || r.error) return setErr(r.error ?? "Não foi possível doar. Tente de novo.");
    onGift(to.user_id, r.to ?? to.full_name.split(" ")[0], amount, r.tickets ?? wallet - amount, r.sent_today ?? sent + amount);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Cabine de bilhetes">
      <div className="vh-panel flex max-h-[92vh] w-full max-w-sm flex-col text-center">
        <p className="vh-title text-xl"><ST>🎫 Cabine de Bilhetes</ST></p>
        <p className="text-xs text-purple-100">
          Doe Bilhetes Dourados para uma amiga. Hoje você já doou <b className="text-amber-200">{sent}</b> de {GIFT_DAILY_MAX}. <ST>Você tem {wallet} 🎫.</ST>
        </p>
        <input className="mt-2 rounded-xl border border-amber-300/50 bg-white/10 px-3 py-2 text-sm font-bold text-amber-50 placeholder:text-purple-200" placeholder="Procurar jogadora…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar jogadora" />
        <ul className="mt-2 min-h-[6rem] flex-1 space-y-1 overflow-y-auto text-left">
          {list.slice(0, 60).map((p) => (
            <li key={p.user_id}>
              <button type="button" className="flex w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-sm font-bold text-amber-50 active:scale-[0.99]" style={{ borderColor: to?.user_id === p.user_id ? "#ffe066" : "rgba(252,211,77,0.35)", background: to?.user_id === p.user_id ? "rgba(255,224,102,0.18)" : "rgba(255,255,255,0.05)" }} onClick={() => setTo(p)}>
                <span className="min-w-0 flex-1 truncate">{p.full_name}</span>
                {p.here ? <span className="text-[10px] font-black text-emerald-200">no shopping</span> : null}
              </button>
            </li>
          ))}
          {list.length === 0 ? <li className="py-3 text-center text-sm text-purple-100">Ninguém encontrada.</li> : null}
        </ul>
        {left <= 0 ? (
          <p className="mt-2 rounded-xl bg-black/30 px-3 py-2 text-sm font-bold text-amber-100">Você já doou os {GIFT_DAILY_MAX} bilhetes de hoje. Volte amanhã!</p>
        ) : (
          <div className="mt-2 flex items-center justify-center gap-2">
            <button type="button" className="vh-iconbtn !h-9 !w-9" onClick={() => setAmount((a) => Math.max(1, a - 1))} aria-label="Menos">
              −
            </button>
            <span className="min-w-[4.5rem] text-lg font-black tabular-nums text-amber-200"><ST>{amount} 🎫</ST></span>
            <button type="button" className="vh-iconbtn !h-9 !w-9" onClick={() => setAmount((a) => Math.min(Math.max(1, max), a + 1))} aria-label="Mais">
              +
            </button>
            <button type="button" className="vh-chip !px-2.5 !py-1 !text-[11px]" onClick={() => setAmount(Math.max(1, max))}>
              máx
            </button>
          </div>
        )}
        {err ? <p className="mt-1 text-sm font-bold text-rose-200">{err}</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="vh-btn vh-btn-dark" onClick={onClose} disabled={busy}>
            Fechar
          </button>
          <button type="button" className="vh-btn" onClick={() => void go()} disabled={busy || !to || left <= 0 || amount < 1 || amount > max}>
            {busy ? "..." : to ? `Doar para ${to.full_name.split(" ")[0]}` : "Escolha uma amiga"}
          </button>
        </div>
      </div>
    </div>
  );
}
