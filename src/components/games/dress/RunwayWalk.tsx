import type { ReactNode } from "react";
import type { DollBase } from "@/lib/games/dress/characters";
import type { Look } from "@/lib/games/dress/items";
import { PaperDoll } from "./PaperDoll";

/** A passarela pintada com a modelo desfilando do fundo até a frente (e o flash das câmeras no fim). */
export function RunwayWalk({ base, look, name, still = false, children }: { base: DollBase; look: Look; name?: string; still?: boolean; children?: ReactNode }) {
  return (
    <div className="vh-runway">
      <div className="vh-walker" data-still={still}>
        <PaperDoll base={base} look={look} title={name ? `Look de ${name}` : "Look"} className="h-full w-auto" />
      </div>
      {still ? null : <div className="vh-flash" aria-hidden />}
      {children}
    </div>
  );
}
