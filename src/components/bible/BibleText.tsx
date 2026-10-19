"use client";

import { useEffect, useState } from "react";

// Texto do capítulo na estrutura da YouVersion (classes yv-*), com tamanho de letra ajustável (guardado no aparelho).

const MIN = 15;
const MAX = 26;
const KEY = "elos-bible-fs";

export function BibleText({ html, bibleCss, fontCss }: { html: string; bibleCss: string; fontCss: string | null }) {
  const [size, setSize] = useState(19);
  // acompanha o modo claro/escuro do app (html[data-mode]); a YouVersion tem tokens próprios para o escuro
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.dataset.mode === "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-mode"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v >= MIN && v <= MAX) setSize(v);
    } catch {
      // sem armazenamento: segue com o padrão
    }
  }, []);

  const change = (d: number) =>
    setSize((s) => {
      const n = Math.max(MIN, Math.min(MAX, s + d));
      try {
        localStorage.setItem(KEY, String(n));
      } catch {
        // ok
      }
      return n;
    });

  return (
    <div>
      {/* a YouVersion pede estes dois estilos; o React leva ambos para o <head> */}
      <link rel="stylesheet" href={bibleCss} precedence="default" />
      {fontCss ? <link rel="stylesheet" href={fontCss} precedence="default" /> : null}
      <div className="mb-3 flex items-center justify-end gap-2 text-sm">
        <span className="text-[var(--muted)]">Letra</span>
        <button type="button" onClick={() => change(-1)} disabled={size <= MIN} className="btn btn-ghost !px-3 !py-1.5" aria-label="Diminuir a letra">
          A−
        </button>
        <button type="button" onClick={() => change(1)} disabled={size >= MAX} className="btn btn-ghost !px-3 !py-1.5" aria-label="Aumentar a letra">
          A+
        </button>
      </div>
      <article
        data-yv-sdk=""
        data-yv-theme={dark ? "dark" : "light"}
        data-slot="yv-bible-renderer"
        style={{ ["--yv-reader-font-size" as string]: `${size}px`, ["--yv-reader-line-height" as string]: "1.7", ["--yv-reader-max-width" as string]: "68ch" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
