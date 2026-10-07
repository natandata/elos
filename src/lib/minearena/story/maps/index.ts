import type { StoryMapDef } from "../types";
import { EDEN_MAP } from "./eden";
import { FIELDS_MAP } from "./fields";
import { GOSEN_MAP, MAR_MAP, MOISES_MAP } from "./exodus";
import { BERSEBA_MAP, CANAA_MAP, EGITO_MAP, SHINAR_MAP } from "./genesis";
import { NOAH_MAP } from "./noah";
import { DESERTO_MAP, SINAI_MAP } from "./sinai";

/** Mapas da campanha (cada capítulo usa um; a Queda reaproveita o Éden). Mapas ainda não construídos não aparecem aqui. */
export const STORY_MAPS: Record<string, StoryMapDef> = { eden: EDEN_MAP, fields: FIELDS_MAP, noah: NOAH_MAP, shinar: SHINAR_MAP, canaa: CANAA_MAP, berseba: BERSEBA_MAP, egito: EGITO_MAP, moises: MOISES_MAP, gosen: GOSEN_MAP, mar: MAR_MAP, deserto: DESERTO_MAP, sinai: SINAI_MAP };
