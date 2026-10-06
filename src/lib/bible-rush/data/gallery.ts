import type { SpeciesId } from "../core/types";

export type GalleryEntry = { id: string; emoji: string; name: string; kind: "Personagem" | "Animal" | "Lugar" | "Objeto"; desc: string; ref: string };

export const GALLERY: GalleryEntry[] = [
  { id: "noah", emoji: "🧔", name: "Noé", kind: "Personagem", desc: "Homem justo que andava com Deus. Construiu a arca e levou a família e os animais para dentro dela.", ref: "Gênesis 6:9–22" },
  { id: "ark", emoji: "🛶", name: "A Arca", kind: "Objeto", desc: "Grande embarcação que Deus mandou Noé construir, com três andares e uma porta ao lado.", ref: "Gênesis 6:14–16" },
  { id: "sheep", emoji: "🐑", name: "Ovelhas", kind: "Animal", desc: "Entre os animais limpos, que Noé levou em maior número para a arca.", ref: "Gênesis 7:2–3" },
  { id: "rabbit", emoji: "🐇", name: "Coelhos", kind: "Animal", desc: "Representam os pequenos animais da terra que também foram preservados.", ref: "Gênesis 7:14" },
  { id: "dove", emoji: "🕊️", name: "Pombas", kind: "Animal", desc: "Aves levadas na arca. Mais tarde, uma pomba voltou a Noé com um ramo de oliveira.", ref: "Gênesis 8:8–11" },
  { id: "parrot", emoji: "🦜", name: "Papagaios", kind: "Animal", desc: "Aves coloridas, representando todas as aves de cada espécie.", ref: "Gênesis 7:14" },
  { id: "horse", emoji: "🐴", name: "Cavalos", kind: "Animal", desc: "Animais de carga e de trabalho, entre os que embarcaram em pares.", ref: "Gênesis 7:8–9" },
  { id: "camel", emoji: "🐪", name: "Camelos", kind: "Animal", desc: "Animais de carga do mundo antigo, representando os rebanhos grandes.", ref: "Gênesis 7:8–9" },
  { id: "lion", emoji: "🦁", name: "Leões", kind: "Animal", desc: "Animais fortes que também foram guardados na arca, sem que nenhuma espécie se perdesse.", ref: "Gênesis 6:19–20" },
  { id: "bear", emoji: "🐻", name: "Ursos", kind: "Animal", desc: "Outros animais da terra salvos junto com Noé, cada espécie com seu casal.", ref: "Gênesis 6:19–20" },
  { id: "door", emoji: "🚪", name: "A Porta", kind: "Lugar", desc: "Depois que todos entraram, foi o Senhor quem fechou a porta da arca.", ref: "Gênesis 7:16" },
];

export const SPECIES_GALLERY: Record<SpeciesId, string> = { sheep: "sheep", rabbit: "rabbit", dove: "dove", parrot: "parrot", horse: "horse", camel: "camel", lion: "lion", bear: "bear" };
