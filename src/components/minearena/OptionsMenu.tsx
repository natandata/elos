"use client";

import { RENDER_DISTANCE } from "@/lib/minearena/config/config";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/minearena/config/settings";

function Slider({ label, text, value, min, max, step = 1, onChange }: { label: string; text: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="ma-opt ma-opt-slider" style={{ ["--p" as string]: `${((value - min) / (max - min)) * 100}%` }}>
      <span>
        {label}: {text}
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  );
}

const yn = (b: boolean) => (b ? "Sim" : "Não");
const SIZES = ["Pequeno", "Médio", "Grande"];
const QUALITY = ["Baixo", "Médio", "Alto"];
const DIFFICULTY = ["Fácil", "Normal", "Difícil"];

/** Menu de opções (no estilo clássico de sandbox): campo de visão, gráficos, som, controles. */
export function OptionsMenu({ settings, mobile, onChange, onDone }: { settings: Settings; mobile: boolean; onChange: (s: Settings) => void; onDone: () => void }) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  const defDist = mobile ? RENDER_DISTANCE.mobile : RENDER_DISTANCE.desktop;
  const defFov = mobile ? 70 : 75;
  const fov = settings.fov || defFov;
  const dist = settings.distance || defDist;

  return (
    <div className="ma-modal ma-opts-modal">
      <div className="ma-opts">
        <h2>Opções</h2>
        <div className="ma-opts-grid">
          <Slider label="Campo de visão" text={settings.fov === 0 || fov === defFov ? "Padrão" : String(fov)} value={fov} min={50} max={110} onChange={(v) => set("fov", v === defFov ? 0 : v)} />
          <Slider label="Distância de visão" text={settings.distance === 0 || dist === defDist ? `Padrão (${defDist})` : `${dist} chunks`} value={dist} min={2} max={8} onChange={(v) => set("distance", v === defDist ? 0 : v)} />
          <Slider label="Sensibilidade" text={`${settings.sensitivity}%`} value={settings.sensitivity} min={40} max={200} step={5} onChange={(v) => set("sensitivity", v)} />
          <Slider label="Volume dos sons" text={settings.volume === 0 ? "Desligado" : `${settings.volume}%`} value={settings.volume} min={0} max={100} step={5} onChange={(v) => set("volume", v)} />
          <button type="button" className="ma-opt" onClick={() => set("quality", (settings.quality >= 2 ? -1 : settings.quality + 1) as -1 | 0 | 1 | 2)}>
            Gráficos: {settings.quality === -1 ? "Automático" : QUALITY[settings.quality]}
          </button>
          <button type="button" className="ma-opt" onClick={() => set("difficulty", ((settings.difficulty + 1) % 3) as 0 | 1 | 2)}>
            Dificuldade: {DIFFICULTY[settings.difficulty]}
          </button>
          <button type="button" className="ma-opt" onClick={() => set("music", !settings.music)}>
            Música: {yn(settings.music)}
          </button>
          <button type="button" className="ma-opt" onClick={() => set("bob", !settings.bob)}>
            Balanço da câmera: {yn(settings.bob)}
          </button>
          <button type="button" className="ma-opt" onClick={() => set("clouds", !settings.clouds)}>
            Nuvens: {yn(settings.clouds)}
          </button>
          <button type="button" className="ma-opt" onClick={() => set("particles", !settings.particles)}>
            Partículas: {yn(settings.particles)}
          </button>
          <button type="button" className="ma-opt" onClick={() => set("coords", !settings.coords)}>
            Mostrar coordenadas: {yn(settings.coords)}
          </button>
          <button type="button" className="ma-opt" onClick={() => set("invertY", !settings.invertY)}>
            Inverter eixo Y: {yn(settings.invertY)}
          </button>
          {mobile ? (
            <button type="button" className="ma-opt" onClick={() => set("touchSize", ((settings.touchSize + 1) % 3) as 0 | 1 | 2)}>
              Botões de toque: {SIZES[settings.touchSize]}
            </button>
          ) : null}
          <button type="button" className="ma-opt" onClick={() => onChange(DEFAULT_SETTINGS)}>
            Restaurar padrão
          </button>
        </div>
        <button type="button" className="ma-opt ma-opt-done" onClick={onDone}>
          Concluído
        </button>
      </div>
    </div>
  );
}
