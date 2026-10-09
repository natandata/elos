import type { CSSProperties, ReactNode } from "react";
import type { DollBase } from "@/lib/games/dress/characters";
import type { Look } from "@/lib/games/dress/items";
import { PaperDoll } from "./PaperDoll";
import { sceneUrl, type SceneKey } from "@/lib/games/dress/themes";

const FLASHES = [0.17, 0.41, 0.55, 0.7, 0.85];
const PETALS = [8, 18, 27, 36, 46, 55, 63, 72, 81, 90, 14, 41, 68, 86];
const CAMS = [6, 20, 34, 66, 80, 93];

/**
 * A passarela pintada: a modelo desfila o tempo todo da votação (entra andando, para e faz a pose, dá uma voltinha,
 * cruza a passarela para os dois lados e termina na frente, com flashes e pétalas). `showMs` é a duração total.
 */
export function RunwayWalk({ base, look, name, scene = "palacio", still = false, pose, showMs, children }: { base: DollBase; look: Look; name?: string; scene?: SceneKey; still?: boolean; pose?: string; showMs?: number; children?: ReactNode }) {
  const live = !!showMs && !still;
  const show = showMs ?? 30000;
  return (
    <div className="vh-runway" style={{ backgroundImage: `url(${sceneUrl(scene)})` }}>
      {live ? (
        <>
          <div className="vh-beam" data-side="l" aria-hidden />
          <div className="vh-beam" data-side="r" aria-hidden />
        </>
      ) : null}
      <div className="vh-walker" data-still={still} data-pose={pose} data-live={live ? "true" : undefined} style={live ? ({ "--vh-show": `${showMs}ms` } as CSSProperties) : undefined}>
        <div className="vh-gait">
          <div className="vh-posewrap">
            <PaperDoll base={base} look={look} title={name ? `Look de ${name}` : "Look"} className="h-full w-auto" />
          </div>
        </div>
      </div>
      {live ? (
        <>
          {FLASHES.map((f) => (
            <div key={f} className="vh-flash" style={{ animationDelay: `${Math.round(show * f)}ms` }} aria-hidden />
          ))}
          {CAMS.map((x, i) => (
            <span key={x} className="vh-cam" style={{ left: `${x}%`, animationDelay: `${i * 0.37}s` }} aria-hidden />
          ))}
          {PETALS.map((x, i) => (
            <span key={`${x}-${i}`} className="vh-petal" style={{ left: `${x}%`, animationDelay: `${Math.round(show * 0.84 + i * 140)}ms` }} aria-hidden>
              {i % 3 === 0 ? "🌸" : i % 3 === 1 ? "✨" : "💖"}
            </span>
          ))}
        </>
      ) : null}
      {children}
    </div>
  );
}
