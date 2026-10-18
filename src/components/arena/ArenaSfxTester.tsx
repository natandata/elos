"use client";

import { useRef } from "react";
import { SFX_FILES, SFX_SOURCES } from "./arenaSfxList";

const LABELS: Record<string, string> = {
  select: "Tocar numa carta",
  deny: "Sem Maná / jogada negada",
  tick: "Contagem (últimos 10 s)",
  tickFinal: "Contagem (últimos 3 s)",
  doubleMana: "Maná em dobro",
  spawnLight: "Tropa leve entra em campo",
  spawnHeavy: "Tropa pesada entra em campo",
  spawnFly: "Voador entra em campo",
  slash: "Golpe corpo a corpo",
  slashHeavy: "Golpe corpo a corpo forte",
  sling: "Arremesso / funda",
  arrow: "Tiro das torres",
  magic: "Magia à distância",
  hitSmall: "Pancada leve",
  hitBig: "Pancada forte",
  heal: "Cura",
  death: "Tropa cai",
  towerDown: "Torre cai (estrondo)",
  towerCrunch: "Torre cai (desmoronar)",
  fogoFall: "Fogo do Céu: cai",
  fogoBoom: "Fogo do Céu: explode",
  marSwell: "Mar Vermelho: onda sobe",
  marCrash: "Mar Vermelho: onda bate",
  crownMine: "Coroa sua",
  crownTheirs: "Coroa do adversário",
  arkLand: "Arca do Noé cai",
  splash: "Respingo na água",
  immune: "Imune (Moisés)",
  muster: "Reforço do Gideão",
};

/** Ouvir cada som da Arena (e as variações que o jogo sorteia). Só para o admin conferir e pedir troca. */
export function ArenaSfxTester() {
  const cur = useRef<HTMLAudioElement | null>(null);
  const play = (file: string) => {
    cur.current?.pause();
    const a = new Audio(`/arena/sfx/${file}`);
    a.volume = 0.8;
    cur.current = a;
    void a.play().catch(() => undefined);
  };
  return (
    <div className="space-y-2">
      {Object.entries(SFX_FILES).map(([slot, files]) => (
        <div key={slot} className="card flex flex-wrap items-center gap-2 p-3">
          <div className="min-w-[200px] flex-1">
            <p className="text-sm font-black">{LABELS[slot] ?? slot}</p>
            <p className="text-xs text-[var(--muted)]">{slot}</p>
          </div>
          {files.map((f, i) => (
            <button key={f} type="button" onClick={() => play(f)} className="btn btn-ghost !py-1.5 text-xs" title={SFX_SOURCES[f]}>
              ▶ {i + 1} <span className="ml-1 opacity-60">{SFX_SOURCES[f]?.replace(".ogg", "")}</span>
            </button>
          ))}
        </div>
      ))}
      <p className="pt-2 text-xs text-[var(--muted)]">Sons CC0 do Kenney (www.kenney.nl), convertidos para MP3. O jogo sorteia uma das variações a cada vez.</p>
    </div>
  );
}
