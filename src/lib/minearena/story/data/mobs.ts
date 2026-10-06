// Personagens e animais da campanha (derivados do visual voxel já existente do MineArena).
import { MOB_BY_ID, type MobDef } from "../../entities/definitions";

const hum = (id: string, name: string, title: string, model: Partial<Extract<MobDef["model"], { kind: "humanoid" }>>): MobDef => ({
  id,
  name,
  title,
  behavior: "hero",
  rarity: "lendario",
  hp: 40,
  defense: 0,
  dmg: 0,
  speed: 2.1,
  chaseRange: 0,
  attackRange: 0,
  attackCooldown: 1,
  model: { kind: "humanoid", scale: 1, skin: 0xd09a6a, hair: 0x4a2c14, hairStyle: "short", shirt: 0xe8e0c8, pants: 0xe8e0c8, shoes: 0x6a4a2a, ...model },
  loot: [],
  lines: [],
});

/** Versão pacífica de um animal já existente (sem fugir, sem atacar). */
const calm = (id: string, as: string): MobDef => {
  const base = MOB_BY_ID.get(id);
  if (!base) throw new Error(`mob ${id} não existe`);
  return { ...base, id: as, behavior: "passive", dmg: 0, abilities: [], spawn: undefined, loot: [], hp: 999, evil: false };
};

export const STORY_MOBS: Record<string, MobDef> = {
  // Éden: antes da queda, vestes de folhas e linho claro
  adao: hum("adao", "Adão", "O primeiro homem", { skin: 0xc58a58, hair: 0x4a2a14, hairStyle: "short", shirt: 0xf3ecd2, pants: 0xf3ecd2, belt: 0xe0c050, scale: 1.04 }),
  eva: hum("eva", "Eva", "A mulher", { skin: 0xd9a574, hair: 0x6a3a1e, hairStyle: "long", shirt: 0xf6efd8, pants: 0xf6efd8, robe: true, belt: 0xe0c050 }),
  // depois de comer o fruto: cobrem-se com folhas de figueira (Gênesis 3:7)
  adao_folhas: hum("adao_folhas", "Adão", "O primeiro homem", { skin: 0xc58a58, hair: 0x4a2a14, hairStyle: "short", shirt: 0x6fa24a, pants: 0x6fa24a, belt: 0x4a7a2a, scale: 1.04 }),
  eva_folhas: hum("eva_folhas", "Eva", "A mulher", { skin: 0xd9a574, hair: 0x6a3a1e, hairStyle: "long", shirt: 0x7fb25a, pants: 0x7fb25a, robe: true, belt: 0x4a7a2a }),
  // depois da queda: túnicas de pele (Gênesis 3:21)
  adao_pele: hum("adao_pele", "Adão", "O primeiro homem", { skin: 0xc58a58, hair: 0x4a2a14, hairStyle: "short", shirt: 0x8a6a42, pants: 0x7a5a38, belt: 0x4a3018, fur: 0x8a6a42, scale: 1.04 }),
  eva_pele: hum("eva_pele", "Eva", "A mulher", { skin: 0xd9a574, hair: 0x6a3a1e, hairStyle: "long", shirt: 0x8a6a42, pants: 0x7a5a38, robe: true, belt: 0x4a3018, fur: 0x8a6a42 }),
  serpente: { ...calm("serpente", "serpente_story"), name: "A serpente", behavior: "passive" },
  // o querubim que guarda o jardim (Gênesis 3:24)
  anjo: hum("anjo", "Querubim", "Guarda do jardim", { skin: 0xf3dfc0, hair: 0xf0d890, hairStyle: "long", shirt: 0xffffff, pants: 0xf4f4ff, robe: true, belt: 0xe0c050, staff: true, scale: 1.3 }),
  // o povo da terra nos dias de Noé
  povo_a: hum("povo_a", "Povo", "", { skin: 0xc58a58, hair: 0x2a1a10, shirt: 0xa05a3a, pants: 0x6a4e2e }),
  povo_b: hum("povo_b", "Povo", "", { skin: 0xd9a574, hair: 0x6a3a1e, hairStyle: "long", shirt: 0x4a6a9a, pants: 0x5a4a3a, robe: true }),
  povo_c: hum("povo_c", "Povo", "", { skin: 0xa8703f, hair: 0x1a1008, shirt: 0x7a8a3a, pants: 0x4a3a2a }),
  povo_d: hum("povo_d", "Povo", "", { skin: 0xe0b080, hair: 0x8a5a2a, hairStyle: "long", shirt: 0xb04a5a, pants: 0x6a5a4a, robe: true }),
  // Caim e Abel
  caim: hum("caim", "Caim", "O lavrador", { skin: 0xbf8450, hair: 0x2a1a10, hairStyle: "short", shirt: 0x9a7a4a, pants: 0x6a4e2e, belt: 0x4a3018, bulk: 1.12 }),
  abel: hum("abel", "Abel", "O pastor", { skin: 0xd09a6a, hair: 0x6a4020, hairStyle: "short", shirt: 0xe8e0c8, pants: 0xcfc4a4, belt: 0xc89a3a, staff: true }),
  // Noé
  noe: hum("noe", "Noé", "Homem justo", { skin: 0xc58a58, hair: 0xd8d4cc, hairStyle: "long", beard: 0xd8d4cc, shirt: 0x9a7a4a, pants: 0x9a7a4a, robe: true, belt: 0x5a3a1a, staff: true, scale: 1.05 }),
  sem: hum("sem", "Sem", "Filho de Noé", { skin: 0xc58a58, hair: 0x2a1a10, hairStyle: "short", shirt: 0xb89a62, pants: 0x7a5a38, belt: 0x4a3018 }),
  // animais pacíficos
  ovelha: calm("ovelha", "ovelha_story"),
  boi: calm("boi", "boi_story"),
  cabra: calm("cabra", "cabra_story"),
  galo: calm("galo", "galo_story"),
  camelo: calm("camelo", "camelo_story"),
  cavalo: calm("cavalo", "cavalo_story"),
  leao: calm("leao", "leao_story"),
  urso: calm("urso", "urso_story"),
};
