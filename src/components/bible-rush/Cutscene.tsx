"use client";

import { useEffect, useRef, useState } from "react";
import type { Cutscene } from "@/lib/bible-rush/data/cutscenes";
import type { Settings } from "@/lib/bible-rush/core/types";

const CPS: Record<Settings["textSpeed"], number> = { slow: 22, normal: 42, fast: 90 };
const WAIT: Record<Settings["textSpeed"], number> = { slow: 1.5, normal: 1, fast: 0.65 };

/** Reprodutor de cutscenes: cenário, personagens, fala com digitação e referência bíblica. Toque para avançar; "Pular" a qualquer momento. */
export function CutscenePlayer({ scene, settings, onDone }: { scene: Cutscene; settings: Settings; onDone: () => void }) {
  const [i, setI] = useState(0);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  const next = () => {
    if (i + 1 >= scene.steps.length) doneRef.current();
    else setI(i + 1);
  };
  return <StepView key={i} scene={scene} index={i} settings={settings} onNext={next} onSkip={() => doneRef.current()} />;
}

function StepView({ scene, index, settings, onNext, onSkip }: { scene: Cutscene; index: number; settings: Settings; onNext: () => void; onSkip: () => void }) {
  const step = scene.steps[index];
  const [chars, setChars] = useState(0);
  const full = chars >= step.text.length;
  const nextRef = useRef(onNext);
  useEffect(() => {
    nextRef.current = onNext;
  });

  useEffect(() => {
    const cps = settings.reduceMotion ? 1000 : CPS[settings.textSpeed];
    const id = window.setInterval(() => setChars((c) => Math.min(step.text.length, c + Math.max(1, Math.round(cps / 30)))), 33);
    return () => window.clearInterval(id);
  }, [step.text, settings.textSpeed, settings.reduceMotion]);

  useEffect(() => {
    if (!full) return;
    const id = window.setTimeout(() => nextRef.current(), (step.seconds ?? 5) * 1000 * WAIT[settings.textSpeed]);
    return () => window.clearTimeout(id);
  }, [full, step.seconds, settings.textSpeed]);

  return (
    <div className={`br-cut br-bg-${step.bg} ${settings.reduceMotion ? "br-calm" : ""}`} onClick={() => (full ? onNext() : setChars(step.text.length))} role="dialog" aria-label={scene.title}>
      {step.effect === "rain" ? <div className="br-rain" aria-hidden /> : null}
      {step.effect === "sparkle" ? (
        <div className="br-sparkles" aria-hidden>
          ✦ ✦ ✦
        </div>
      ) : null}
      <div className="br-ground" aria-hidden />
      <div className="br-actors" aria-hidden>
        {(step.actors ?? []).map((a, k) => (
          <span key={k} className={`br-actor br-pos-${a.pos} br-anim-${a.anim ?? "none"} br-size-${a.size ?? "md"}`}>
            {a.emoji}
          </span>
        ))}
      </div>
      <button
        type="button"
        className="br-skip"
        onClick={(e) => {
          e.stopPropagation();
          onSkip();
        }}
      >
        Pular ⏭
      </button>
      <div className="br-dialog">
        {step.speaker ? <p className="br-speaker">{step.speaker}</p> : null}
        <p className="br-line">
          {step.text.slice(0, chars)}
          <span className="br-ghost-text">{step.text.slice(chars)}</span>
        </p>
        {step.ref && full ? <p className="br-ref">📖 {step.ref}</p> : null}
        <p className="br-tap">{full ? "Toque para continuar" : ""}</p>
        <p className="br-dots" aria-hidden>
          {scene.steps.map((_, k) => (
            <span key={k} className={k === index ? "on" : ""} />
          ))}
        </p>
      </div>
    </div>
  );
}
