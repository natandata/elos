"use client";

import type { HudState } from "@/lib/minearena/game";
import { ItemIcon } from "./ItemIcon";

export type Msg = { id: number; text: string; tone: "info" | "good" | "warn" | "rare" };

function Row({ value, max, full, half, empty }: { value: number; max: number; full: string; half: string; empty: string }) {
  const n = max / 2;
  return (
    <span className="ma-row" aria-label={`${value}/${max}`}>
      {Array.from({ length: n }, (_, i) => {
        const v = value - i * 2;
        return (
          <span key={i} className="ma-pip" data-state={v >= 2 ? "full" : v === 1 ? "half" : "empty"}>
            {v >= 2 ? full : v === 1 ? half : empty}
          </span>
        );
      })}
    </span>
  );
}

export function Hud({ hud, msgs, onSelect }: { hud: HudState; msgs: Msg[]; onSelect: (i: number) => void }) {
  const night = hud.phase === "Noite";
  return (
    <div className="ma-hud" aria-live="polite">
      {hud.hurt > 0 ? <div className="ma-hurt" style={{ opacity: hud.hurt * 0.6 }} /> : null}
      <div className="ma-cross" aria-hidden />
      {hud.mining > 0 ? <div className="ma-mine-bar"><i style={{ width: `${Math.min(100, hud.mining * 100)}%` }} /></div> : null}
      {hud.target ? <div className="ma-target">{hud.target}</div> : null}

      <div className="ma-clock" data-night={night}>
        <span aria-hidden>{night ? "🌙" : hud.phase === "Dia" ? "☀️" : "🌅"}</span> {hud.phase}
        {hud.biome ? <small>{hud.biome}</small> : null}
      </div>
      {hud.allies.length > 0 ? <div className="ma-allies">🛡 {hud.allies.join(" · ")}</div> : null}

      {hud.boss ? (
        <div className="ma-boss">
          <b>{hud.boss.name}</b>
          <span><i style={{ width: `${(hud.boss.hp / hud.boss.max) * 100}%` }} /></span>
        </div>
      ) : null}

      <div className="ma-msgs">
        {msgs.map((m) => (
          <p key={m.id} data-tone={m.tone}>
            {m.text}
          </p>
        ))}
      </div>

      <div className="ma-bottom">
        <div className="ma-stats">
          <Row value={hud.health} max={20} full="❤️" half="💔" empty="🖤" />
          {hud.armor > 0 ? <Row value={Math.min(20, hud.armor)} max={20} full="🛡️" half="🔰" empty="▫️" /> : null}
          <Row value={hud.hunger} max={20} full="🍗" half="🦴" empty="▫️" />
        </div>
        {hud.heldName ? (
          <p className="ma-held" style={{ color: hud.heldColor }}>
            {hud.heldName}
          </p>
        ) : null}
        <div className="ma-hotbar">
          {hud.hotbar.map((s, i) => (
            <button key={i} type="button" className="ma-slot" data-on={i === hud.selected} onPointerDown={() => onSelect(i)} aria-label={`Slot ${i + 1}`}>
              {s ? <ItemIcon item={s.item} count={s.count} size={38} /> : null}
              <em>{i + 1}</em>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
