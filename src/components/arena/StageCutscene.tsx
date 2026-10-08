"use client";

import { useEffect, useState } from "react";
import { CAMPAIGN_STAGES } from "@/lib/arena/campaign";

/** Duração total de cada cena final. */
export const STAGE_CUTSCENE_MS = 10_000;

type Scene = { title: string; shots: [string, string, string]; captions: [string, string, string]; float: string[]; accent: string };

/** Cenas finais das arenas (a do Nery tem a dela, em NeryCutscene). Chave = chave do chefe da arena. */
const SCENES: Record<string, Scene> = {
  amandinha: { title: "Na selva, com a Amandinha", accent: "#86efac", float: ["🍃", "🦋", "🌿"], shots: ["amandinha-1", "amandinha-2", "amandinha-3"], captions: ["A selva é escura… e todo mundo está com medo.", "Fiquem juntos! A Amandinha conhece cada trilha.", "Por aqui! A clareira está logo à frente."] },
  mbappe: { title: "Uma pausa em Paris", accent: "#fcd34d", float: ["☕", "🥐", "✨"], shots: ["mbappe-1", "mbappe-2", "mbappe-3"], captions: ["Uma pausa merecida numa praça de Paris.", "Café, croissant e boas risadas.", "Um brinde à amizade!"] },
  henrique: { title: "Show do Henrique", accent: "#f0abfc", float: ["🎸", "🎶", "✨"], shots: ["henrique-1", "henrique-2", "henrique-3"], captions: ["Milhares de fãs. Um só solo.", "Todo mundo cantando junto!", "O solo do Henrique faz a arena tremer!"] },
  tiaaline: { title: "Aula com a Tia Aline", accent: "#93c5fd", float: ["➕", "✖️", "📐"], shots: ["tiaaline-1", "tiaaline-2", "tiaaline-3"], captions: ["Aula de matemática com a Tia Aline.", "Será que alguém entendeu a equação?", "Muito bem, turma! Até o Nery acertou."] },
  natanrebeca: { title: "O casamento do Natan e da Rebeca", accent: "#f9a8d4", float: ["🌸", "🤍", "💍"], shots: ["natanrebeca-1", "natanrebeca-2", "natanrebeca-3"], captions: ["Hoje é dia de casamento!", "Chuva de pétalas para os noivos!", "Para sempre juntos. 💍"] },
  zepa: { title: "A pregação do Pastor Zepa", accent: "#fde68a", float: ["✨", "🕊️", "📖"], shots: ["zepa-1", "zepa-2", "zepa-3"], captions: ["O Pastor Zepa abre a Palavra.", "Silêncio. Todos prestando atenção.", "A Palavra ilumina a arena."] },
  marcelinho: { title: "A turma chega ao templo", accent: "#facc15", float: ["⛪", "✨", "🌹"], shots: ["marcelinho-1", "marcelinho-2", "marcelinho-3"], captions: ["O Marcelinho abre as portas do templo.", "A turma chegou! Toca aqui!", "Juntos somos mais fortes. Vitória da turma!"] },
};

export const stageSceneKey = (stage: number): string | null => CAMPAIGN_STAGES[stage]?.boss ?? null;
/** A arena tem cena final própria (a do Nery, índice 2, usa a NeryCutscene)? */
export const hasStageScene = (stage: number): boolean => stage !== 2 && !!SCENES[stageSceneKey(stage) ?? ""];

const IMG = (n: string) => `/arena/cutscene/${n}.webp`;

/**
 * Cena final de uma arena (10 s), tocada depois de toda batalha nela, vença ou perca:
 * três ilustrações em sequência, com legenda, zoom lento e partículas.
 */
export function StageCutscene({ stage, onDone }: { stage: number; onDone: () => void }) {
  const [ms, setMs] = useState(0);
  const scene = SCENES[stageSceneKey(stage) ?? ""];
  const st = CAMPAIGN_STAGES[stage];

  useEffect(() => {
    if (scene) for (const s of scene.shots) new Image().src = IMG(s);
    const start = performance.now();
    const tick = window.setInterval(() => setMs(performance.now() - start), 80);
    const done = window.setTimeout(onDone, STAGE_CUTSCENE_MS);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [scene, onDone]);

  if (!scene) return null;
  const idx = ms < 3400 ? 0 : ms < 6800 ? 1 : 2;
  const local = (ms - idx * 3400) / 3400;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-black text-white" aria-label={`Cena final: ${scene.title}`}>
      <style>{`
        @keyframes scFloat{0%{transform:translateY(105vh) rotate(0);opacity:0}10%{opacity:.9}100%{transform:translateY(-15vh) rotate(40deg);opacity:0}}
        @keyframes scBlack{0%,90%{opacity:0}100%{opacity:1}}
        @keyframes scIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .sc-black{position:absolute;inset:0;background:#000;pointer-events:none;opacity:0;animation:scBlack 10s linear forwards}
      `}</style>

      {/* fundo: a mesma cena ampliada e desfocada */}
      {scene.shots.map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`bg${s}`} src={IMG(s)} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl transition-opacity duration-700" style={{ opacity: idx === i ? 0.55 : 0 }} draggable={false} />
      ))}

      {/* o quadro: a ilustração da vez, com zoom lento */}
      <div className="absolute inset-x-0 top-[9%] bottom-[19%] mx-auto flex max-w-[460px] items-center justify-center px-4">
        <div className="relative h-full w-full overflow-hidden rounded-3xl border-[3px] shadow-[0_10px_40px_rgba(0,0,0,0.7)]" style={{ borderColor: scene.accent }}>
          {scene.shots.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s} src={IMG(s)} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700" style={{ opacity: idx === i ? 1 : 0, transform: `scale(${1.02 + (idx === i ? local : 1) * 0.1})` }} draggable={false} />
          ))}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
        </div>
      </div>

      {/* partículas do ambiente */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="absolute text-2xl" style={{ left: `${(i * 37) % 100}%`, bottom: 0, animation: `scFloat ${5 + (i % 4)}s linear ${(i * 0.7) % 4}s infinite` }}>
            {scene.float[i % scene.float.length]}
          </span>
        ))}
      </div>

      <div className="absolute inset-x-0 top-3 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: scene.accent }}>
          {st.emoji} {st.name}
        </p>
        <p className="mt-0.5 text-lg font-black [text-shadow:0_2px_8px_#000]">{scene.title}</p>
      </div>

      <div className="absolute inset-x-0 bottom-[5%] mx-auto max-w-[460px] px-6 text-center">
        <p key={idx} className="rounded-2xl bg-black/65 px-4 py-3 text-lg font-black leading-snug ring-2 backdrop-blur-sm" style={{ animation: "scIn .5s ease-out both", ["--tw-ring-color" as string]: scene.accent }}>
          {scene.captions[idx]}
        </p>
      </div>
      <div className="sc-black" />
    </div>
  );
}
