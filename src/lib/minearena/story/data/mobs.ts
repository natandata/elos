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
  model: { kind: "humanoid", scale: 1, skin: 0xd09a6a, hair: 0x4a2c14, hairStyle: "short", shirt: 0xe8e0c8, pants: 0xe8e0c8, shoes: 0x6a4a2a, fancy: true, ...model },
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
  // o querubim da espada flamejante: belo e temível, escolta o casal até o portão (Gênesis 3:24)
  querubim: hum("querubim", "Querubim", "Guarda do jardim", { skin: 0xf6e3c4, hair: 0xffe9a0, hairStyle: "long", shirt: 0xfffbea, pants: 0xfff3d2, shoes: 0xe0b84a, robe: true, belt: 0xe0b84a, wings: 0xfff1c8, halo: 0xffd45a, flame: 0xff8a1e, flameSword: 0xff7a1a, scale: 1.7 }),
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
  // Babel
  construtor: hum("construtor", "Mestre de obras", "Construtor de Sinar", { skin: 0xb98050, hair: 0x2a1a10, shirt: 0xc9a56a, pants: 0x8a6a42, belt: 0x4a3018, bulk: 1.1 }),
  // Abraão
  abrao: hum("abrao", "Abrão", "Pai de muitos", { skin: 0xc58a58, hair: 0xb8b0a0, hairStyle: "short", beard: 0xb8b0a0, shirt: 0xe8e0c8, pants: 0xe8e0c8, robe: true, belt: 0x8a5a2a, staff: true, scale: 1.04 }),
  abraao: hum("abraao", "Abraão", "Pai de muitos", { skin: 0xc58a58, hair: 0xd8d4cc, hairStyle: "short", beard: 0xd8d4cc, shirt: 0xf3ecd2, pants: 0xf3ecd2, robe: true, belt: 0xe0c050, staff: true, scale: 1.05 }),
  sarai: hum("sarai", "Sarai", "Esposa de Abrão", { skin: 0xd9a574, hair: 0x9a8a7a, hairStyle: "long", shirt: 0xb86a8a, pants: 0xb86a8a, robe: true, belt: 0xe0c050 }),
  sara: hum("sara", "Sara", "Mãe de Isaque", { skin: 0xd9a574, hair: 0xc8c0b8, hairStyle: "long", shirt: 0xc87a9a, pants: 0xc87a9a, robe: true, belt: 0xe0c050 }),
  lo: hum("lo", "Ló", "Sobrinho de Abraão", { skin: 0xc58a58, hair: 0x3a2a1a, shirt: 0x7a8aa8, pants: 0x6a5a4a, belt: 0x4a3018 }),
  visitante_a: hum("visitante_a", "Visitante", "Um dos três", { skin: 0xd0a070, hair: 0x4a3a2a, shirt: 0xf4f0e4, pants: 0xf4f0e4, robe: true, belt: 0xe0c050 }),
  visitante_b: hum("visitante_b", "Visitante", "Um dos três", { skin: 0xd0a070, hair: 0x4a3a2a, shirt: 0xf4f0e4, pants: 0xf4f0e4, robe: true, belt: 0xe0c050 }),
  visitante_c: hum("visitante_c", "Visitante", "Um dos três", { skin: 0xd0a070, hair: 0x4a3a2a, shirt: 0xf4f0e4, pants: 0xf4f0e4, robe: true, belt: 0xe0c050 }),
  isaque_bebe: hum("isaque_bebe", "Isaque", "O filho da promessa", { skin: 0xd9a574, hair: 0x3a2a1a, shirt: 0xf6efd8, pants: 0xf6efd8, scale: 0.45 }),
  // Isaque e Jacó
  isaque: hum("isaque", "Isaque", "O filho da promessa", { skin: 0xc58a58, hair: 0xb0a898, beard: 0xb0a898, shirt: 0xe8e0c8, pants: 0xcfc4a4, robe: true, belt: 0xc89a3a, staff: true }),
  esau: hum("esau", "Esaú", "O caçador", { skin: 0xbf8450, hair: 0xa8421e, hairStyle: "long", beard: 0xa8421e, shirt: 0x7a4a2a, pants: 0x5a3a22, belt: 0x3a2412, fur: 0x7a4a2a, bulk: 1.18, scale: 1.04 }),
  jaco: hum("jaco", "Jacó", "O que agarra o calcanhar", { skin: 0xd09a6a, hair: 0x4a2c14, shirt: 0xe0d0a8, pants: 0xc4b48a, belt: 0x8a5a2a, staff: true }),
  raquel: hum("raquel", "Raquel", "Pastora de Harã", { skin: 0xd9a574, hair: 0x2a1a10, hairStyle: "long", shirt: 0x6a9ab8, pants: 0x6a9ab8, robe: true, belt: 0xe0c050 }),
  // José
  jose: hum("jose", "José", "O filho amado", { skin: 0xc98f5e, hair: 0x3a2412, hairStyle: "long", shirt: 0xd0502a, pants: 0xc0a040, robe: true, belt: 0xe0c050 }),
  jose_egito: hum("jose_egito", "José", "Governador do Egito", { skin: 0xc98f5e, hair: 0x1a1008, shirt: 0xf8f4e8, pants: 0xf8f4e8, robe: true, belt: 0xe0c050, scale: 1.04 }),
  irmao_a: hum("irmao_a", "Irmão de José", "Filho de Jacó", { skin: 0xbf8450, hair: 0x2a1a10, beard: 0x2a1a10, shirt: 0x8a7a5a, pants: 0x6a5a3a, belt: 0x3a2412 }),
  irmao_b: hum("irmao_b", "Irmão de José", "Filho de Jacó", { skin: 0xc58a58, hair: 0x4a2a14, beard: 0x4a2a14, shirt: 0x9a8a62, pants: 0x6a5a3a, belt: 0x3a2412, bulk: 1.1 }),
  irmao_c: hum("irmao_c", "Irmão de José", "Filho de Jacó", { skin: 0xb87a48, hair: 0x1a1008, beard: 0x1a1008, shirt: 0x7a6a4a, pants: 0x5a4a32, belt: 0x3a2412 }),
  potifar: hum("potifar", "Potifar", "Oficial do Faraó", { skin: 0xb98050, hair: 0x1a1008, shirt: 0x2a4a8a, pants: 0xf0ecd8, robe: true, belt: 0xe0c050, bulk: 1.08 }),
  copeiro: hum("copeiro", "O copeiro", "Servo do Faraó", { skin: 0xb98050, hair: 0x1a1008, shirt: 0xe8e0c8, pants: 0xe8e0c8, belt: 0x8a5a2a }),
  fara: hum("fara", "Faraó", "Rei do Egito", { skin: 0xb98050, hair: 0x1a1008, shirt: 0xe0c050, pants: 0xf8f4e8, robe: true, belt: 0x2a4a8a, scale: 1.1 }),
  // Êxodo
  moises_egito: hum("moises_egito", "Moisés", "Criado na casa do Faraó", { skin: 0xc98f5e, hair: 0x1a1008, shirt: 0xf8f4e8, pants: 0xf8f4e8, robe: true, belt: 0xe0c050 }),
  moises_velho: hum("moises_velho", "Moisés", "Pastor e libertador", { skin: 0xc58a58, hair: 0xd8d4cc, hairStyle: "long", beard: 0xd8d4cc, shirt: 0x9a7a4a, pants: 0x9a7a4a, robe: true, belt: 0x5a3a1a, staff: true, scale: 1.05 }),
  arao: hum("arao", "Arão", "Irmão de Moisés", { skin: 0xc58a58, hair: 0xe0dcd4, hairStyle: "short", beard: 0xe0dcd4, shirt: 0xf3ecd2, pants: 0xf3ecd2, robe: true, belt: 0x2a4a8a, scale: 1.04 }),
  miriam: hum("miriam", "Miriã", "Irmã de Moisés", { skin: 0xd9a574, hair: 0x2a1a10, hairStyle: "long", shirt: 0xc87a5a, pants: 0xc87a5a, robe: true, belt: 0xe0c050 }),
  zipora: hum("zipora", "Zípora", "Filha de Jetro", { skin: 0xd9a574, hair: 0x2a1a10, hairStyle: "long", shirt: 0x8a5a9a, pants: 0x8a5a9a, robe: true, belt: 0xe0c050 }),
  jetro: hum("jetro", "Jetro", "Sacerdote de Midiã", { skin: 0xb98050, hair: 0xc8c0b8, beard: 0xc8c0b8, shirt: 0x7a5a3a, pants: 0x7a5a3a, robe: true, belt: 0x4a3018, staff: true }),
  capataz: hum("capataz", "Feitor", "Capataz egípcio", { skin: 0xb98050, hair: 0x1a1008, shirt: 0xb04a3a, pants: 0xe8e0c8, belt: 0xe0c050, staff: true, bulk: 1.12 }),
  egipcio: hum("egipcio", "Soldado egípcio", "Exército do Faraó", { skin: 0xb98050, hair: 0x1a1008, shirt: 0xc9a24a, pants: 0xe8e0c8, belt: 0x2a4a8a, staff: true, bulk: 1.08 }),
  // Deserto, Sinai e o bezerro de ouro
  bezalel: hum("bezalel", "Bezalel", "Artesão do santuário", { skin: 0xbf8450, hair: 0x2a1a10, beard: 0x2a1a10, shirt: 0x2a5a8a, pants: 0xe8e0c8, robe: true, belt: 0xe0c050, bulk: 1.08 }),
  aoliabe: hum("aoliabe", "Aoliabe", "Artesão do santuário", { skin: 0xc58a58, hair: 0x4a2a14, shirt: 0x8a2a3a, pants: 0xe8e0c8, robe: true, belt: 0xe0c050 }),
  josue: hum("josue", "Josué", "Servo de Moisés", { skin: 0xc58a58, hair: 0x2a1a10, shirt: 0xb89a62, pants: 0x6a5a3a, belt: 0x3a2412, staff: true }),
  // Conquista de Canaã
  calebe: hum("calebe", "Calebe", "Espia da tribo de Judá", { skin: 0xbf8450, hair: 0x3a2a1a, beard: 0x3a2a1a, shirt: 0xc9a56a, pants: 0x6a5a3a, belt: 0x3a2412, bulk: 1.08 }),
  espia_a: hum("espia_a", "Espia", "Enviado por Josué", { skin: 0xc58a58, hair: 0x2a1a10, shirt: 0x8a7a5a, pants: 0x5a4a32, belt: 0x3a2412, staff: true }),
  espia_b: hum("espia_b", "Espia", "Enviado por Josué", { skin: 0xb87a48, hair: 0x4a2a14, shirt: 0x9a8a62, pants: 0x5a4a32, belt: 0x3a2412, staff: true }),
  gigante: hum("gigante", "Anaquim", "Filho de Anaque", { skin: 0xb98050, hair: 0x1a1008, beard: 0x1a1008, shirt: 0x6a4a3a, pants: 0x4a3a2a, belt: 0x2a1a10, bulk: 1.25, scale: 1.7 }),
  raabe: hum("raabe", "Raabe", "Moradora de Jericó", { skin: 0xd0a070, hair: 0x2a1a10, hairStyle: "long", shirt: 0xb83a4a, pants: 0xb83a4a, robe: true, belt: 0xe0c050 }),
  guarda_jerico: hum("guarda_jerico", "Guarda de Jericó", "Soldado do rei", { skin: 0xb98050, hair: 0x1a1008, shirt: 0x7a4a2a, pants: 0x5a4a32, belt: 0x2a1a10, staff: true, bulk: 1.08 }),
  sacerdote: hum("sacerdote", "Sacerdote", "Leva a arca da aliança", { skin: 0xc58a58, hair: 0x2a1a10, beard: 0x2a1a10, shirt: 0xf8f4e8, pants: 0xf8f4e8, robe: true, belt: 0x2a4a8a }),
  comandante: hum("comandante", "Comandante do exército do Senhor", "Mensageiro de Deus", { skin: 0xf6e3c4, hair: 0xffe9a0, hairStyle: "long", shirt: 0xfffbea, pants: 0xfff3d2, shoes: 0xe0b84a, robe: true, belt: 0xe0b84a, halo: 0xffd45a, flameSword: 0xff7a1a, scale: 1.5 }),
  // Juízes e Rute
  gideao: hum("gideao", "Gideão", "O menor da casa de seu pai", { skin: 0xc58a58, hair: 0x2a1a10, beard: 0x2a1a10, shirt: 0x9a8a62, pants: 0x6a5a3a, belt: 0x3a2412, bulk: 1.08 }),
  midianita: hum("midianita", "Midianita", "Das tendas de Midiã", { skin: 0xb98050, hair: 0x1a1008, shirt: 0xb0603a, pants: 0x4a3a2a, belt: 0x2a1a10, staff: true }),
  manoa: hum("manoa", "Manoá", "Pai de Sansão", { skin: 0xc58a58, hair: 0x4a2a14, beard: 0x4a2a14, shirt: 0xc9b48a, pants: 0x6a5a3a, robe: true, belt: 0x4a3018 }),
  mae_sansao: hum("mae_sansao", "Esposa de Manoá", "Mãe de Sansão", { skin: 0xd9a574, hair: 0x2a1a10, hairStyle: "long", shirt: 0x8a6a9a, pants: 0x8a6a9a, robe: true, belt: 0xe0c050 }),
  sansao: hum("sansao", "Sansão", "O nazireu de Deus", { skin: 0xc58a58, hair: 0x2a1a10, hairStyle: "long", shirt: 0x8a6a42, pants: 0x6a4a2a, belt: 0x4a3018, bulk: 1.3, scale: 1.12 }),
  sansao_rapado: hum("sansao_rapado", "Sansão", "Sem os cabelos", { skin: 0xc58a58, hair: 0x2a1a10, hairStyle: "short", shirt: 0x7a6a52, pants: 0x5a4a32, belt: 0x4a3018, bulk: 1.15, scale: 1.05 }),
  dalila: hum("dalila", "Dalila", "Do vale de Soreque", { skin: 0xd0a070, hair: 0x1a1008, hairStyle: "long", shirt: 0x7a2a5a, pants: 0x7a2a5a, robe: true, belt: 0xe0c050 }),
  filisteu: hum("filisteu", "Filisteu", "Príncipe ou guarda de Gaza", { skin: 0xb98050, hair: 0x1a1008, shirt: 0x3a5a8a, pants: 0x4a3a2a, belt: 0xe0c050, staff: true, bulk: 1.1 }),
  noemi: hum("noemi", "Noemi", "A que voltou de Moabe", { skin: 0xd0a070, hair: 0xc8c0b8, hairStyle: "long", shirt: 0x6a5a7a, pants: 0x6a5a7a, robe: true, belt: 0x4a3018 }),
  rute: hum("rute", "Rute", "A moabita", { skin: 0xd9a574, hair: 0x2a1a10, hairStyle: "long", shirt: 0x4a8a8a, pants: 0x4a8a8a, robe: true, belt: 0xe0c050 }),
  orfa: hum("orfa", "Orfa", "Nora de Noemi", { skin: 0xd9a574, hair: 0x3a2a1a, hairStyle: "long", shirt: 0xa06a4a, pants: 0xa06a4a, robe: true, belt: 0xe0c050 }),
  boaz: hum("boaz", "Boaz", "Homem rico de Belém", { skin: 0xc58a58, hair: 0x4a3a2a, beard: 0x4a3a2a, shirt: 0x2a5a8a, pants: 0xe8e0c8, robe: true, belt: 0xe0c050, bulk: 1.08, scale: 1.04 }),
  parente: hum("parente", "O parente mais chegado", "Resgatador", { skin: 0xbf8450, hair: 0x2a1a10, beard: 0x2a1a10, shirt: 0x7a4a3a, pants: 0x5a4a32, belt: 0x3a2412 }),
  anciao: hum("anciao", "Ancião de Belém", "Assentado à porta", { skin: 0xc58a58, hair: 0xd8d4cc, beard: 0xd8d4cc, shirt: 0x8a7a5a, pants: 0x8a7a5a, robe: true, belt: 0x4a3018, staff: true }),
  // Samuel, Saul e Davi
  ana: hum("ana", "Ana", "Mãe de Samuel", { skin: 0xd9a574, hair: 0x2a1a10, hairStyle: "long", shirt: 0x8a5a8a, pants: 0x8a5a8a, robe: true, belt: 0xe0c050 }),
  eli: hum("eli", "Eli", "Sacerdote em Siló", { skin: 0xc58a58, hair: 0xd8d4cc, beard: 0xd8d4cc, shirt: 0xf3ecd2, pants: 0xf3ecd2, robe: true, belt: 0x2a4a8a, staff: true, bulk: 1.1 }),
  samuel_menino: hum("samuel_menino", "Samuel", "O menino do santuário", { skin: 0xd09a6a, hair: 0x3a2412, shirt: 0xf8f4e8, pants: 0xf8f4e8, belt: 0xe0c050, scale: 0.7 }),
  samuel: hum("samuel", "Samuel", "Profeta e juiz de Israel", { skin: 0xc58a58, hair: 0xb8b0a0, beard: 0xb8b0a0, hairStyle: "long", shirt: 0xf3ecd2, pants: 0xf3ecd2, robe: true, belt: 0x2a4a8a, staff: true, scale: 1.04 }),
  saul: hum("saul", "Saul", "O primeiro rei de Israel", { skin: 0xc58a58, hair: 0x2a1a10, beard: 0x2a1a10, shirt: 0x8a2a3a, pants: 0x6a4a2a, belt: 0xe0c050, bulk: 1.12, scale: 1.18 }),
  jesse: hum("jesse", "Jessé", "Pai de Davi", { skin: 0xc58a58, hair: 0xb0a898, beard: 0xb0a898, shirt: 0x8a7a5a, pants: 0x8a7a5a, robe: true, belt: 0x4a3018, staff: true }),
  davi: hum("davi", "Davi", "O pastor de Belém", { skin: 0xd09a6a, hair: 0xb04a1e, shirt: 0xc9b48a, pants: 0x7a5a38, belt: 0x4a3018, sling: true, scale: 0.94 }),
  // Davi e Golias, Davi e Saul, Davi Rei
  golias: hum("golias", "Golias", "Campeão filisteu de Gate", { skin: 0xb98050, hair: 0x1a1008, beard: 0x1a1008, shirt: 0xa6783a, pants: 0x6a4a2a, belt: 0x2a1a10, staff: true, bulk: 1.35, scale: 2.3 }),
  eliabe: hum("eliabe", "Eliabe", "Irmão mais velho de Davi", { skin: 0xbf8450, hair: 0x3a2412, beard: 0x3a2412, shirt: 0x8a7a5a, pants: 0x6a5a3a, belt: 0x3a2412, bulk: 1.1 }),
  soldado: hum("soldado", "Soldado de Israel", "Do exército de Saul", { skin: 0xc58a58, hair: 0x2a1a10, shirt: 0x7a5a3a, pants: 0x5a4a32, belt: 0x3a2412, staff: true, bulk: 1.08 }),
  soldado_b: hum("soldado_b", "Soldado de Israel", "Do exército de Saul", { skin: 0xb87a48, hair: 0x4a2a14, beard: 0x4a2a14, shirt: 0x6a6a4a, pants: 0x5a4a32, belt: 0x3a2412, staff: true }),
  abner: hum("abner", "Abner", "Comandante do exército de Saul", { skin: 0xbf8450, hair: 0x2a1a10, beard: 0x2a1a10, shirt: 0x7a2a2a, pants: 0x5a4a32, belt: 0xe0c050, bulk: 1.15, scale: 1.06 }),
  joabe: hum("joabe", "Joabe", "Comandante de Davi", { skin: 0xbf8450, hair: 0x2a1a10, beard: 0x2a1a10, shirt: 0x5a6a8a, pants: 0x4a3a2a, belt: 0xe0c050, staff: true, bulk: 1.18 }),
  natan: hum("natan", "Natã", "Profeta do Senhor", { skin: 0xc58a58, hair: 0xb8b0a0, beard: 0xb8b0a0, hairStyle: "long", shirt: 0x2a4a6a, pants: 0xe8e0c8, robe: true, belt: 0x8a5a2a, staff: true, scale: 1.04 }),
  davi_rei: hum("davi_rei", "Davi", "Rei de Israel", { skin: 0xd09a6a, hair: 0xb04a1e, beard: 0x8a3a14, shirt: 0x6a2a8a, pants: 0xe8e0c8, robe: true, belt: 0xe0c050, scale: 1.02 }),
  jebuseu: hum("jebuseu", "Jebuseu", "Defensor de Jebus", { skin: 0xb98050, hair: 0x1a1008, beard: 0x1a1008, shirt: 0x8a5a3a, pants: 0x4a3a2a, belt: 0x2a1a10, staff: true, bulk: 1.1 }),
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
