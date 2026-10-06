// Campanhas do Modo História. O Antigo Testamento está pronto; o Novo Testamento já tem lugar na arquitetura
// (outro conjunto de capítulos, mapas e missões, no mesmo diretor) e abre no dia 13 de dezembro.
import type { ChapterDef } from "./types";
import { CHAPTERS } from "./data/chapters";

export type CampaignDef = {
  id: "ot" | "nt";
  title: string;
  subtitle: string;
  chapters: ChapterDef[];
  /** abre à 00:00 de Brasília nesta data (ISO); sem data = sempre aberta */
  releaseAt?: string;
};

export const CAMPAIGNS: CampaignDef[] = [
  { id: "ot", title: "O ANTIGO TESTAMENTO", subtitle: "A jornada de Gênesis a Ester", chapters: CHAPTERS },
  { id: "nt", title: "O NOVO TESTAMENTO", subtitle: "Em breve", chapters: [], releaseAt: "2026-12-13T00:00:00-03:00" },
];

export const campaignOpen = (c: CampaignDef, now = Date.now()): boolean => c.chapters.length > 0 && (!c.releaseAt || now >= new Date(c.releaseAt).getTime());
