import { BLOCKS } from "../../blocks/blocks";
import { B } from "../../blocks/blocks";
import { CHUNK, WORLD_H } from "../../config/config";
import { CHAPTER_BY_ID } from "../data/chapters";
import { RELICS } from "../data/relics";
import type { StoryMapDef } from "../types";
import { EDEN_MAP } from "./eden";
import { FIELDS_MAP } from "./fields";
import { GOSEN_MAP, MAR_MAP, MOISES_MAP } from "./exodus";
import { BERSEBA_MAP, CANAA_MAP, EGITO_MAP, SHINAR_MAP } from "./genesis";
import { NOAH_MAP } from "./noah";
import { DESERTO_MAP, SINAI_MAP } from "./sinai";
import { ESPIAS_MAP, JORDAO_MAP, NEBO_MAP } from "./conquista";
import { JERICO_MAP } from "./jerico";
import { GIDEAO_MAP, RUTE_MAP, SANSAO_MAP } from "./juizes";
import { BELEM_MAP, BENJAMIM_MAP, SILO_MAP } from "./reino";
import { ELA_MAP, ENGEDI_MAP, JERUSALEM_MAP } from "./davi";

/** Mapas da campanha (cada capítulo usa um; a Queda reaproveita o Éden). Mapas ainda não construídos não aparecem aqui. */
const RAW_MAPS: Record<string, StoryMapDef> = { eden: EDEN_MAP, fields: FIELDS_MAP, noah: NOAH_MAP, shinar: SHINAR_MAP, canaa: CANAA_MAP, berseba: BERSEBA_MAP, egito: EGITO_MAP, moises: MOISES_MAP, gosen: GOSEN_MAP, mar: MAR_MAP, deserto: DESERTO_MAP, sinai: SINAI_MAP, espias: ESPIAS_MAP, nebo: NEBO_MAP, jerico: JERICO_MAP, jordao: JORDAO_MAP, gideao: GIDEAO_MAP, sansao: SANSAO_MAP, rute: RUTE_MAP, silo: SILO_MAP, benjamim: BENJAMIM_MAP, belem: BELEM_MAP, elah: ELA_MAP, engedi: ENGEDI_MAP, jerusalem: JERUSALEM_MAP };

/** Abre a "cova" da relíquia do capítulo: duas células de ar sob a camada de cima (é preciso cavar para chegar nela). */
function withRelics(def: StoryMapDef): StoryMapDef {
  const rel = Object.values(RELICS).filter((r) => CHAPTER_BY_ID.get(r.chapter)?.map === def.id);
  if (rel.length === 0) return def;
  return {
    ...def,
    generate: (cx, cz, env) => {
      const res = def.generate(cx, cz, env);
      for (const r of rel) {
        if (Math.floor(r.x / CHUNK) !== cx || Math.floor(r.z / CHUNK) !== cz) continue;
        const lx = r.x - cx * CHUNK;
        const lz = r.z - cz * CHUNK;
        let top = -1;
        for (let y = WORLD_H - 1; y > 0; y--) {
          const id = res.data[lx + lz * CHUNK + y * CHUNK * CHUNK];
          if (id !== B.air && BLOCKS[id]?.solid) {
            top = y;
            break;
          }
        }
        if (top < 4) continue;
        for (const y of [top - 1, top - 2]) res.data[lx + lz * CHUNK + y * CHUNK * CHUNK] = B.air;
      }
      return res;
    },
  };
}

export const STORY_MAPS: Record<string, StoryMapDef> = Object.fromEntries(Object.entries(RAW_MAPS).map(([k, v]) => [k, withRelics(v)]));
