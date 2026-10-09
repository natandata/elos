import type { ReactNode } from "react";
import type { DollBase } from "@/lib/games/dress/characters";
import type { Look } from "@/lib/games/dress/items";
import { PaperDoll } from "./PaperDoll";
import { sceneUrl, type SceneKey } from "@/lib/games/dress/themes";

/** A passarela pintada com a modelo desfilando do fundo até a frente (e o flash das câmeras no fim). */
/** `pose`: como a modelo para no fim da passarela (salas ao vivo; ver .vh-walker[data-pose]). */
export function RunwayWalk({ base, look, name, scene = "palacio", still = false, pose, showMs, children }: { base: DollBase; look: Look; name?: string; scene?: SceneKey; still?: boolean; pose?: string; showMs?: number; children?: ReactNode }) {
  return (
    <div className="vh-runway" style={{ backgroundImage: `url(${sceneUrl(scene)})` }}>
      <div className="vh-walker" data-still={still} data-pose={pose} data-live={showMs ? "true" : undefined} style={showMs ? ({ "--vh-show": `${showMs}ms` } as React.CSSProperties) : undefined}>
        <PaperDoll base={base} look={look} title={name ? `Look de ${name}` : "Look"} className="h-full w-auto" />
      </div>
      {still ? null : <div className="vh-flash" aria-hidden />}
      {children}
    </div>
  );
}
