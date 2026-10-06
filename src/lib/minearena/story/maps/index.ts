import type { StoryMapDef } from "../types";
import { EDEN_MAP } from "./eden";
import { FIELDS_MAP } from "./fields";
import { NOAH_MAP } from "./noah";

/** Mapas da campanha (cada capítulo usa um; a Queda reaproveita o Éden). Mapas ainda não construídos não aparecem aqui. */
export const STORY_MAPS: Record<string, StoryMapDef> = { eden: EDEN_MAP, fields: FIELDS_MAP, noah: NOAH_MAP };
