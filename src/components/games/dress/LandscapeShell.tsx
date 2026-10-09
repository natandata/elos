"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

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
      <div className="vh-shell" data-mobile={mobile ? "1" : "0"} data-rot={rotated ? "1" : "0"} data-land={land ? "1" : "0"} onContextMenu={(e) => e.preventDefault()}>
        {children}
      </div>
    </LandscapeContext.Provider>
  );
}
