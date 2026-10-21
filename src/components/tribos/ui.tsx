/* eslint-disable @next/next/no-img-element */
import type { Kind, Res, TribeKey } from "@/lib/tribos/data";
import { emblemUrl } from "./emblems";

// Pequenas peças de interface do Clash of Tribos: ícones (reaproveitados dos jogos da plataforma) e emblemas.

export type IconName =
  | "moeda" | "gota" | "diamante" | "castelo" | "bau-ouro" | "picareta" | "tenda" | "barril" | "martelo" | "espadas" | "capacete" | "bolsa" | "ampulheta" | "trofeu" | "escudo" | "casa" | "torre" | "seta-baixo" | "x" | "certo";

export const iconSrc = (n: IconName): string => `/arena/icones/${n}.webp`;

export function TIcon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return <img src={iconSrc(name)} alt="" draggable={false} className={`inline-block shrink-0 object-contain ${className}`} />;
}

export const RES_ICON: Record<Res, IconName> = { gold: "moeda", mana: "gota", gems: "diamante" };

export function ResIcon({ res, className = "h-4 w-4" }: { res: Res; className?: string }) {
  return <TIcon name={RES_ICON[res]} className={className} />;
}

/** Ícone de cada construção ou obstáculo (mesma arte do campo da Arena). */
export const KIND_ICON: Record<Kind, string> = {
  hq: "/tribos/obras/salao-reliquias.webp",
  gold_mine: "/tribos/obras/mina-ouro.webp",
  mana_pump: "/tribos/obras/poco-mana.webp",
  gold_store: "/tribos/obras/cofre-ouro.webp",
  mana_store: "/tribos/obras/reservatorio-mana.webp",
  hut: "/tribos/obras/cabana-bravos.webp",
  bush: "/arena/campo/arbusto.webp",
  tree: "/arena/campo/arvore.webp",
  rock: "/arena/campo/rochedo.webp",
};

export function KindIcon({ kind, className = "h-8 w-8" }: { kind: Kind; className?: string }) {
  return <img src={KIND_ICON[kind]} alt="" draggable={false} className={`inline-block shrink-0 object-contain ${className}`} />;
}

export function TribeEmblem({ tribe, className = "h-12 w-auto" }: { tribe: TribeKey; className?: string }) {
  return <img src={emblemUrl(tribe)} alt="" draggable={false} className={`inline-block shrink-0 drop-shadow ${className}`} />;
}
