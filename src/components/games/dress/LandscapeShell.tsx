"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

/**
 * O Vista o Herói ao vivo é jogado com o celular deitado (como o MineArena). No celular a tela vira "tela cheia" e,
 * se o aparelho não deixar travar a orientação, a interface gira sozinha 90° para a jogadora poder jogar deitada.
 * `rotated` diz que a tela está girada por CSS (os toques precisam ser convertidos; ver MallStore3D).
 */
export type LandscapeInfo = { mobile: boolean; rotated: boolean; land: boolean };
const LandscapeContext = createContext<LandscapeInfo>({ mobile: false, rotated: false, land: true });
export const useLandscape = (): LandscapeInfo => useContext(LandscapeContext);

const coarse = () => window.matchMedia("(pointer: coarse)").matches;
const subCoarse = (fn: () => void) => {
  const m = window.matchMedia("(pointer: coarse)");
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};
const portraitNow = () => window.matchMedia("(orientation: portrait)").matches;
const subPortrait = (fn: () => void) => {
  const m = window.matchMedia("(orientation: portrait)");
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};

export function LandscapeShell({ children }: { children: ReactNode }) {
  const mobile = useSyncExternalStore(subCoarse, coarse, () => false);
  const portrait = useSyncExternalStore(subPortrait, portraitNow, () => false);
  const rotated = mobile && portrait;
  const land = rotated || !portrait;
  const info = useMemo<LandscapeInfo>(() => ({ mobile, rotated, land }), [mobile, rotated, land]);

  // medida real da área visível (no iPhone as barras do Safari sobem e descem: 100dvh/100dvw por CSS erram e cortam a tela girada)
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!rotated) return;
    const measure = () => {
      const v = window.visualViewport;
      const w = Math.round(v?.width ?? window.innerWidth);
      const h = Math.round(v?.height ?? window.innerHeight);
      setVp((o) => (o && o.w === w && o.h === h ? o : { w, h }));
    };
    measure();
    const v = window.visualViewport;
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    v?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      v?.removeEventListener("resize", measure);
    };
  }, [rotated]);
  const rotStyle = rotated && vp ? { left: vp.w, width: vp.h, height: vp.w } : undefined;

  useEffect(() => {
    if (!mobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobile]);

  return (
    <LandscapeContext.Provider value={info}>
      <div className="vh-shell" data-mobile={mobile ? "1" : "0"} data-rot={rotated ? "1" : "0"} data-land={land ? "1" : "0"} style={rotStyle} onContextMenu={(e) => e.preventDefault()}>
        {children}
      </div>
    </LandscapeContext.Provider>
  );
}
