"use client";

import { useState } from "react";
import { BUILDINGS, BUILD_KINDS, MAX_TH, TRIBES, fmtDuration, fmtNum, gemsForResource, type BuildKind } from "@/lib/tribos/data";
import { BAGS, BAG_SIZES, BEASTS, HEROES, SHOP_TABS, TROOPS, type ShopTab, type ShopUnit } from "@/lib/tribos/shop";
import { capacity, quoteBuild, type TState } from "@/lib/tribos/state";
import { KindIcon, ResIcon, TIcon, TribeEmblem, type IconName } from "./ui";

// Loja do Clash of Tribos: janela no centro da tela, com madeira escura e moldura dourada, abas à esquerda e vitrines à direita.

type Tone = "wood" | "gold" | "blue" | "violet" | "green" | "rose";
const TONES: Record<Tone, string> = {
  wood: "linear-gradient(160deg, #7a5430 0%, #4d3219 100%)",
  gold: "linear-gradient(160deg, #ffe58a 0%, #d99a1d 100%)",
  blue: "linear-gradient(160deg, #6fa8ff 0%, #2f58c7 100%)",
  violet: "linear-gradient(160deg, #b98bff 0%, #6a3fc4 100%)",
  green: "linear-gradient(160deg, #7fdc8a 0%, #2c8a49 100%)",
  rose: "linear-gradient(160deg, #ff9a8f 0%, #c43d3d 100%)",
};

function Price({ res, n, dim = false }: { res: "gold" | "mana" | "gems"; n: number; dim?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-black/55 py-0.5 pl-1.5 pr-2 text-[11px] font-black text-white ${dim ? "opacity-70" : ""}`}>
      <ResIcon res={res} className="h-4 w-4" />
      {fmtNum(n)}
    </span>
  );
}

function Card({
  tone, soon, locked, onClick, children, wide,
}: {
  tone: Tone; soon?: boolean; locked?: boolean; onClick?: () => void; children: React.ReactNode; wide?: boolean;
}) {
  const clickable = !!onClick && !locked && !soon;
  const body = (
    <>
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      {soon ? <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-[#2a1b0e] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#ffd66b]">Em breve</span> : null}
      {children}
    </>
  );
  const cls = `relative flex flex-col items-center overflow-hidden rounded-2xl border-2 border-[#2a1b0e] p-2 text-center text-white shadow-[0_3px_0_#1b1007] ${wide ? "col-span-2" : ""} ${locked || soon ? "opacity-75 saturate-75" : ""}`;
  return clickable ? (
    <button type="button" onClick={onClick} className={`${cls} transition active:translate-y-[2px] active:shadow-none`} style={{ background: TONES[tone] }}>
      {body}
    </button>
  ) : (
    <div className={cls} style={{ background: TONES[tone] }}>
      {body}
    </div>
  );
}

function UnitCard({ u, tone, big }: { u: ShopUnit; tone: Tone; big?: boolean }) {
  return (
    <Card tone={tone} soon>
      <div className={`relative grid w-full place-items-center ${big ? "h-28" : "h-24"}`}>
        <span className="absolute inset-x-3 bottom-1 h-3 rounded-full bg-black/30 blur-[2px]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={u.art} alt="" draggable={false} className={`relative object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.45)] ${big ? "h-28" : "h-24"}`} />
      </div>
      <p className="mt-1 text-[13px] font-black leading-tight [text-shadow:0_1px_0_rgba(0,0,0,0.5)]">{u.name}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/85">{u.role}</p>
      <p className="mt-0.5 min-h-[24px] text-[10px] font-semibold leading-tight text-white/90">{u.stat}</p>
      <div className="mt-1"><Price res={u.res} n={u.price} /></div>
    </Card>
  );
}

export function TribosShop({
  st, now, busy, onClose, onPlace, onBag,
}: {
  st: TState; now: number; busy: boolean; onClose: () => void; onPlace: (kind: BuildKind) => void; onBag: (res: "gold" | "mana", pct: 25 | 50 | 100) => void;
}) {
  const [tab, setTab] = useState<ShopTab>("construcoes");
  const tribe = TRIBES[st.player.tribe];
  const th = Math.max(1, ...st.buildings.filter((b) => b.kind === "hq").map((b) => b.level));

  const intro: Record<ShopTab, string> = {
    construcoes: "Cresça a vila: cada construção usa um obreiro livre.",
    tropas: "Tropas treinadas no Quartel. Chegam junto com o Exército.",
    herois: "Heróis da Bíblia lutam ao seu lado. Chegam junto com o Exército.",
    feras: "Feras da Bíblia como companheiras de batalha. Em breve.",
    bolsas: "Falta recurso? Troque gemas por bolsas que enchem seus cofres.",
  };

  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-black/60 p-2 backdrop-blur-[2px]" onClick={onClose} role="dialog" aria-label="Loja da tribo">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[min(94dvh,560px)] w-[min(980px,98vw)] flex-col overflow-hidden rounded-[26px] border-[3px] border-[#f0c35a] text-white"
        style={{ background: "linear-gradient(180deg, #6a4626 0%, #432a15 55%, #2f1d0e 100%)", boxShadow: "0 0 0 3px #3a2208, 0 24px 70px rgba(0,0,0,0.7), inset 0 0 0 2px rgba(255,229,154,0.28)" }}
      >
        {/* faixa do título */}
        <header className="relative flex items-center gap-2 px-3 pb-1.5 pt-2" style={{ background: `linear-gradient(180deg, ${tribe.color}, ${tribe.dark})`, boxShadow: "0 3px 0 #1b1007" }}>
          <TribeEmblem tribe={st.player.tribe} className="h-9 w-auto" />
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="text-lg font-black uppercase tracking-wider [text-shadow:0_2px_0_rgba(0,0,0,0.45)]">Loja da Tribo</h2>
            <p className="truncate text-[11px] font-semibold text-white/90">{intro[tab]}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-black/50 py-1 pl-2 pr-1.5 text-sm font-black">
            {fmtNum(st.player.gems)} <ResIcon res="gems" className="h-5 w-5" />
          </span>
          <button onClick={onClose} aria-label="Fechar a loja" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#2a1b0e] bg-[#c43d3d] text-lg font-black shadow-[0_2px_0_#1b1007] active:translate-y-[1px]">
            ✕
          </button>
        </header>

        <div className="flex min-h-0 flex-1 gap-2 p-2">
          {/* abas */}
          <nav className="flex w-[104px] shrink-0 flex-col gap-1.5" aria-label="Seções da loja">
            {SHOP_TABS.map((t) => {
              const on = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl border-2 px-1 py-1 text-center text-[10px] font-black uppercase leading-none tracking-tight transition ${on ? "border-[#ffe59a] text-white shadow-[0_0_0_2px_#3a2208,0_0_14px_rgba(255,214,102,0.5)]" : "border-[#2a1b0e] text-white/75"}`}
                  style={{ background: on ? `linear-gradient(160deg, ${tribe.color}, ${tribe.dark})` : "linear-gradient(160deg, #5a3d22, #3a2614)" }}
                  aria-pressed={on}
                >
                  <TIcon name={t.icon as IconName} className={on ? "h-7 w-7 drop-shadow" : "h-6 w-6 opacity-85"} />
                  <span className="block max-w-full truncate">{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* vitrine */}
          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border-2 border-[#2a1b0e] bg-[#24160a]/80 p-2 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
            {tab === "construcoes" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(138px,1fr))] gap-2">
                {BUILD_KINDS.filter((k) => k !== "hq").map((k) => {
                  const d = BUILDINGS[k];
                  const have = st.buildings.filter((b) => b.kind === k).length;
                  const max = d.count[Math.min(MAX_TH, th) - 1];
                  const q = quoteBuild(st, k, now);
                  const tone: Tone = d.makes === "gold" || d.stores === "gold" ? "gold" : d.makes === "mana" || d.stores === "mana" ? "blue" : "wood";
                  return (
                    <Card key={k} tone={tone} locked={!q.ok} onClick={() => onPlace(k)}>
                      <div className="relative grid h-24 w-full place-items-center">
                        <span className="absolute inset-x-4 bottom-0 h-3 rounded-full bg-black/30 blur-[2px]" />
                        <KindIcon kind={k} className="relative h-24 w-24 drop-shadow-[0_5px_4px_rgba(0,0,0,0.4)]" />
                      </div>
                      <p className="mt-1 text-[13px] font-black leading-tight [text-shadow:0_1px_0_rgba(0,0,0,0.5)]">{d.name}</p>
                      <p className="text-[10px] font-bold text-white/85">{have}/{max} construídas</p>
                      <div className="mt-1 flex min-h-[22px] flex-wrap items-center justify-center gap-1">
                        {q.ok ? (
                          <>
                            <Price res={q.pay} n={q.cost} />
                            {q.secs > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-black/55 py-0.5 pl-1.5 pr-2 text-[11px] font-black">
                                <TIcon name="ampulheta" className="h-4 w-4" /> {fmtDuration(q.secs)}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="rounded-lg bg-black/55 px-2 py-0.5 text-[10px] font-bold leading-tight text-[#ffd0cb]">{q.error?.replace(/\. .*$/, ".")}</span>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : null}

            {tab === "tropas" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(138px,1fr))] gap-2">
                {TROOPS.map((u, i) => <UnitCard key={u.id} u={u} tone={(["green", "wood", "rose", "gold", "rose", "violet", "blue", "wood"] as Tone[])[i % 8]} />)}
              </div>
            ) : null}

            {tab === "herois" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
                {HEROES.map((u, i) => <UnitCard key={u.id} u={u} big tone={(["blue", "gold", "violet", "rose", "green", "rose"] as Tone[])[i % 6]} />)}
              </div>
            ) : null}

            {tab === "feras" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(138px,1fr))] gap-2">
                {BEASTS.map((u, i) => <UnitCard key={u.id} u={u} tone={(["gold", "green", "wood", "violet", "blue"] as Tone[])[i % 5]} />)}
              </div>
            ) : null}

            {tab === "bolsas" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                {BAGS.map((bag) => {
                  const live = bag.live && (bag.res === "gold" || bag.res === "mana");
                  const res = bag.res === "gold" || bag.res === "mana" ? bag.res : null;
                  const cap = res ? capacity(st.buildings, res) : 0;
                  const have = res === "gold" ? st.player.gold : res === "mana" ? st.player.mana : 0;
                  const free = Math.max(0, cap - have);
                  const tone: Tone = bag.res === "gold" ? "gold" : bag.res === "mana" ? "blue" : bag.res === "stone" ? "wood" : "violet";
                  return (
                    <Card key={bag.res} tone={tone} soon={!live}>
                      <div className="flex w-full items-center gap-2 text-left">
                        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-black/25">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={bag.art} alt="" draggable={false} className="h-11 w-11 object-contain drop-shadow" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-black leading-tight [text-shadow:0_1px_0_rgba(0,0,0,0.5)]">{bag.name}</span>
                          <span className="block text-[10px] font-semibold leading-tight text-white/90">{bag.sub}</span>
                        </span>
                      </div>
                      <div className="mt-2 grid w-full gap-1.5">
                        {BAG_SIZES.map((sz) => {
                          const amount = Math.min(Math.floor((cap * sz.pct) / 100), free);
                          const gems = gemsForResource(amount);
                          const ok = live && res && amount > 0 && st.player.gems >= gems;
                          return (
                            <button
                              key={sz.pct}
                              type="button"
                              disabled={!ok || busy || !live}
                              onClick={() => res && onBag(res, sz.pct)}
                              className="flex items-center justify-between gap-2 rounded-xl border-2 border-[#2a1b0e] bg-black/35 px-2 py-1.5 text-left text-[11px] font-black disabled:opacity-50 enabled:active:translate-y-[1px]"
                            >
                              <span>{sz.label}{live && res ? <span className="ml-1 font-semibold text-white/80">+{fmtNum(amount)}</span> : null}</span>
                              {live && res ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-[#7fdc8a] to-[#2c8a49] px-2 py-0.5">
                                  <ResIcon res="gems" className="h-4 w-4" /> {fmtNum(gems)}
                                </span>
                              ) : (
                                <span className="text-white/60">—</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {live && res && free <= 0 ? <p className="mt-1 text-[10px] font-bold text-[#ffd66b]">Cofre cheio</p> : null}
                    </Card>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
