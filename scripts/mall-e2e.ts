// Teste sem navegador do Madureira Shopping: planta, escadas rolantes (sobe e desce todos os andares andando de verdade
// pelo mesmo movimento do jogo), portas das lojas, mesas da praça de alimentação e prateleiras.
// Rodar: npx tsx scripts/mall-e2e.ts
import { concourseWorld, stepBody, type Body } from "../src/lib/games/dress/mallPhysics";
import { Crowd } from "../src/lib/games/dress/npcSim";
import {
  BOOTH,
  CLOSED,
  ESCALATORS,
  FLOOR_COUNT,
  FLOOR_H,
  FOOD_FLOOR,
  CONSTRUCTION,
  FOODS,
  HX,
  INFO_DESK,
  RESTAURANTS,
  STORES,
  STORE_HL,
  STORE_HW,
  WALLS,
  doorSpawn,
  floorAt,
  floorHalfZ,
  floorY,
  holesOf,
  routeBetween,
  seatsOf,
  storeShelves,
  subtractRects,
  surfaceY,
  tablesOf,
  type Pt,
} from "../src/lib/games/dress/shopping";

const problems: string[] = [];
const bad = (m: string) => problems.push(m);
const area = (r: { x0: number; x1: number; z0: number; z1: number }) => (r.x1 - r.x0) * (r.z1 - r.z0);

// ---- pisos: área do andar = placa - buracos
for (let f = 0; f < FLOOR_COUNT; f++) {
  const hz = floorHalfZ(f);
  const plate = { x0: -HX, x1: HX, z0: -hz, z1: hz };
  const holes = holesOf(f);
  const parts = subtractRects(plate, holes);
  const holeArea = holes.reduce((n, h) => n + area(h), 0);
  const got = parts.reduce((n, p) => n + area(p), 0);
  if (Math.abs(got - (area(plate) - holeArea)) > 0.01) bad(`andar ${f}: área do piso ${got.toFixed(1)} != ${(area(plate) - holeArea).toFixed(1)}`);
  for (const h of holes) if (surfaceY((h.x0 + h.x1) / 2, (h.z0 + h.z1) / 2, floorY(f)) >= floorY(f) - 0.01 && f > 0 && surfaceY((h.x0 + h.x1) / 2, (h.z0 + h.z1) / 2, floorY(f)) === floorY(f)) bad(`andar ${f}: buraco com piso`);
}

// ---- anda de verdade: sobe do térreo ao 4º andar e desce de volta
const world = concourseWorld();
function walk(b: Body, path: Pt[], tag: string): number {
  let t = 0;
  let idx = 0;
  const dt = 1 / 30;
  while (idx < path.length && t < 240) {
    const tgt = path[idx];
    const dx = tgt.x - b.x;
    const dz = tgt.z - b.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.7) {
      idx++;
      continue;
    }
    stepBody(world, b, { x: (dx / d) * 5.2, z: (dz / d) * 5.2 }, dt, false);
    t += dt;
  }
  if (idx < path.length) bad(`${tag}: travou no ponto ${idx}/${path.length} em (${b.x.toFixed(1)}, ${b.z.toFixed(1)}, y=${b.y.toFixed(1)})`);
  return t;
}
const body = (x: number, z: number, y: number): Body => ({ x, z, y, vx: 0, vz: 0, vy: 0, grounded: true });
for (let to = 1; to < FLOOR_COUNT; to++) {
  const b = body(0, 14, 0);
  const goal: Pt = { x: 0, z: to === FOOD_FLOOR ? 30 : 14 };
  const path = routeBetween(0, to, { x: 0, z: 14 }, goal);
  const t = walk(b, path, `subir 0->${to}`);
  if (Math.abs(b.y - floorY(to)) > 0.15) bad(`subir 0->${to}: terminou em y=${b.y.toFixed(2)} (esperado ${floorY(to)})`);
  // e desce de volta
  const back = routeBetween(to, 0, { x: goal.x, z: goal.z }, { x: 0, z: 14 });
  const t2 = walk(b, back, `descer ${to}->0`);
  if (Math.abs(b.y) > 0.15) bad(`descer ${to}->0: terminou em y=${b.y.toFixed(2)}`);
  console.log(`andar ${to}: ida ${t.toFixed(1)}s, volta ${t2.toFixed(1)}s`);
}

// ---- grades: de um andar alto não dá para cair no átrio andando reto
{
  const b = body(0, 14, floorY(2));
  b.y = floorY(2);
  for (let i = 0; i < 300; i++) stepBody(world, b, { x: 0, z: -5.2 }, 1 / 30, false);
  if (b.y < floorY(2) - 0.2) bad(`caiu no átrio do 2º andar (y=${b.y.toFixed(1)})`);
  if (WALLS.length < 20) bad("poucas grades");
}

// ---- pulo: não passa por cima da grade
{
  const b = body(0, 14, floorY(2));
  let cleared = false;
  for (let i = 0; i < 600; i++) {
    stepBody(world, b, { x: 0, z: -5.2 }, 1 / 30, i % 25 === 0);
    if (b.z < 9 && b.z > -9 && Math.abs(b.x) < 14 && b.y < floorY(2) - 1) cleared = true;
  }
  if (cleared) bad("pulou a grade do átrio");
}

// ---- portas das lojas: o ponto de saída tem piso e as lojas não se sobrepõem
for (const s of [...STORES, ...CLOSED]) {
  const p = doorSpawn(s);
  const y = surfaceY(p.x, p.z, floorY(s.floor));
  if (y !== floorY(s.floor)) bad(`loja ${s.id}: porta sem piso (${y})`);
}
for (const s of STORES) {
  const same = [...STORES, ...CLOSED].filter((o) => o.floor === s.floor && o.side === s.side && o.id !== s.id && Math.abs(o.x - s.x) < 17);
  if (same.length) bad(`loja ${s.id} sobreposta a ${same.map((o) => o.id).join(",")}`);
  const sh = storeShelves(s.slots ?? []);
  if (sh.placed.length < 8) bad(`loja ${s.id}: poucas peças (${sh.placed.length})`);
  const keys = new Set<string>();
  for (const p of sh.placed) {
    const k = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
    if (keys.has(k)) bad(`loja ${s.id}: duas peças no mesmo lugar ${k}`);
    keys.add(k);
    if (Math.abs(p.z) > STORE_HL - 1 || Math.abs(p.x) > STORE_HW) bad(`loja ${s.id}: peça fora do salão (${p.x}, ${p.z})`);
  }
  console.log(`loja ${s.id}: ${sh.placed.length} peças em ${sh.units.length} colunas`);
}

// ---- obras: de fora não dá para entrar andando nem pulando
{
  const b = body((CONSTRUCTION.x0 + CONSTRUCTION.x1) / 2 - 8, 14, floorY(FOOD_FLOOR));
  for (let i = 0; i < 900; i++) stepBody(world, b, { x: 3, z: -5 }, 1 / 30, i % 20 === 0);
  const inside = b.x > CONSTRUCTION.x0 && b.x < CONSTRUCTION.x1 && Math.abs(b.z) < CONSTRUCTION.z1;
  if (inside) bad(`entrou na obra (${b.x.toFixed(1)}, ${b.z.toFixed(1)})`);
  const c = body(CONSTRUCTION.x0 - 3, 0, floorY(FOOD_FLOOR));
  for (let i = 0; i < 600; i++) stepBody(world, c, { x: 6, z: 0 }, 1 / 30, i % 15 === 0);
  if (c.x > CONSTRUCTION.x0 - 0.2) bad(`passou pela cerca da obra (${c.x.toFixed(1)})`);
}

// ---- cabine, balcão, praça de alimentação
if (surfaceY(BOOTH.front.x, BOOTH.front.z, 0) !== 0) bad("cabine de bilhetes sem piso");
if (surfaceY(INFO_DESK.front.x, INFO_DESK.front.z, 0) !== 0) bad("balcão de informações sem piso");
const seen = new Set<string>();
for (const r of RESTAURANTS) {
  const tables = tablesOf(r);
  const seats = seatsOf(r);
  if (tables.length !== 9 || seats.length !== 18) bad(`${r.key}: mesas/cadeiras erradas`);
  for (const s of seats) {
    const k = `${s.x},${s.z}`;
    if (seen.has(k)) bad(`${r.key}: cadeira repetida ${k}`);
    seen.add(k);
    if (surfaceY(s.x, s.z, floorY(FOOD_FLOOR)) !== floorY(FOOD_FLOOR)) bad(`${r.key}: cadeira sem piso`);
  }
  const foods = FOODS.filter((f) => f.place === r.key);
  if (foods.length !== 4) bad(`${r.key}: ${foods.length} itens no cardápio`);
}
if (ESCALATORS.length !== 4) bad("escadas rolantes");
if (FLOOR_H !== 9) bad("altura do andar");

// ---- multidão: 30 por andar durante 10 minutos de simulação, sem cair, sem travar, com conversas e gente sentada
{
  const seats = RESTAURANTS.flatMap((r) => seatsOf(r)).map((s) => ({ ...s, y: floorY(FOOD_FLOOR) + 0.5 }));
  const crowd = new Crowd(concourseWorld(), seats);
  let talking = 0;
  let sitting = 0;
  let rides = 0;
  let worst = 0;
  const lines = new Set<string>();
  const wasRide = new Set<number>();
  for (let i = 0; i < 30 * 600; i++) {
    crowd.update(1 / 30, i % 900 < 450 ? 0 : FOOD_FLOOR);
    if (i % 30 !== 0) continue;
    for (const n of crowd.npcs) {
      if (n.mode === "talk") talking++;
      if (n.mode === "sit") sitting++;
      if (n.mode === "ride" && !wasRide.has(n.id)) {
        wasRide.add(n.id);
        rides++;
      }
      if (n.mode !== "ride" && n.mode !== "sit" && n.b.y < floorY(floorAt(n.b.y)) - 0.4) bad(`multidão: ${n.id} caiu (y=${n.b.y.toFixed(1)})`);
      if (n.mode !== "ride") wasRide.delete(n.id);
      const say = crowd.speaking(n);
      if (say) lines.add(say);
    }
    for (let f = 0; f < FLOOR_COUNT; f++) {
      const c = crowd.countOnFloor(f);
      worst = Math.max(worst, Math.abs(c - 30));
    }
  }
  for (let f = 0; f < FLOOR_COUNT; f++) {
    const idle = crowd.npcs.filter((n) => n.home === f);
    if (Math.abs(idle.length - 30) > 2) bad(`multidão: andar ${f} terminou com ${idle.length} personagens`);
  }
  if (worst > 4) bad(`multidão: andar ficou com diferença de ${worst} personagens`);
  if (talking < 200) bad(`multidão: quase ninguém conversou (${talking})`);
  if (sitting < 200) bad(`multidão: quase ninguém sentou (${sitting})`);
  if (rides < 10) bad(`multidão: quase ninguém usou a escada rolante (${rides})`);
  console.log(`multidão: ${talking} conversas, ${sitting} sentadas, ${rides} subidas/descidas, ${lines.size} falas diferentes, pior desvio ${worst}`);
}

if (problems.length === 0) console.log("NENHUM PROBLEMA");
else {
  console.log("PROBLEMAS:");
  for (const p of problems) console.log(" -", p);
  process.exit(1);
}
