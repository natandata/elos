import Link from "next/link";
import type { EnglishState } from "@/lib/english/data.server";
import { BabelTower } from "./BabelTower";
import { IcoBack, IcoFlame, IcoGem, IcoHeart } from "./icons";

// Topo das telas do Babel: voltar, marca e os contadores (ofensiva, gemas, corações).
export function BabelTop({ state }: { state: EnglishState }) {
  const b = state.babel;
  return (
    <div className="bb-top">
      <Link href="/app/jogos" className="text-[var(--bb-mute)]" aria-label="Voltar à Sala de Jogos">
        <IcoBack />
      </Link>
      <span className="flex items-center gap-1.5 text-xl font-black tracking-tight text-[var(--bb-green)]">
        <BabelTower className="h-6 w-6" />
        babel
      </span>
      <span className="ml-auto flex items-center gap-3">
        <Link href="/app/jogos/ingles/perfil" className="bb-chip" style={{ color: "var(--bb-orange)" }} aria-label={`${state.streak} dias de ofensiva`}>
          <IcoFlame />
          {state.streak}
        </Link>
        <Link href="/app/jogos/ingles/loja" className="bb-chip" style={{ color: "var(--bb-blue)" }} aria-label={`${b.gems} gemas`}>
          <IcoGem />
          {b.gems}
        </Link>
        <Link href="/app/jogos/ingles/loja" className="bb-chip" style={{ color: b.hearts > 0 ? "var(--bb-red)" : "var(--bb-mute)" }} aria-label={`${b.hearts} corações`}>
          <IcoHeart broken={b.hearts === 0} />
          {b.hearts}
        </Link>
      </span>
    </div>
  );
}
