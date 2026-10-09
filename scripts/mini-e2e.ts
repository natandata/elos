// Teste sem navegador dos mapas dos minigames: geração determinística, baús e pontos de partida dentro do mundo, tempo por chunk.
// Rodar: npx tsx scripts/mini-e2e.ts
import { B } from "../src/lib/minearena/blocks/blocks";
import { CHUNK, WORLD_H } from "../src/lib/minearena/config/config";
import { miniMap } from "../src/lib/minearena/mini/maps";
import { MINI_GAMES } from "../src/lib/minearena/mini/types";

const problems = new Map<string, number>();
const bad = (m: string) => problems.set(m, (problems.get(m) ?? 0) + 1);
const hash = (a: Uint8Array) => {
  let h = 2166136261;
  for (let i = 0; i < a.length; i += 7) h = Math.imul(h ^ a[i], 16777619);
  return h >>> 0;
};

for (const g of MINI_GAMES) {
  const map = miniMap(g.id, 12345);
  const map2 = miniMap(g.id, 12345);
  let chests = 0;
  let ms = 0;
  let maxMs = 0;
  const solid = new Map<string, Uint8Array>();
  const cx0 = Math.floor((map.center.x - 150) / CHUNK);
  const cx1 = Math.floor((map.center.x + 150) / CHUNK);
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cz = cx0; cz <= cx1; cz++) {
      const t = performance.now();
      const r = map.generate(cx, cz);
      const dt = performance.now() - t;
      ms += dt;
      maxMs = Math.max(maxMs, dt);
      const r2 = map2.generate(cx, cz);
      if (hash(r.data) !== hash(r2.data) || r.chests.length !== r2.chests.length) bad(`${g.id}: chunk ${cx},${cz} não determinístico`);
      for (const c of r.chests) {
        chests++;
        if (c.x < cx * CHUNK || c.x >= cx * CHUNK + CHUNK || c.z < cz * CHUNK || c.z >= cz * CHUNK + CHUNK) bad(`${g.id}: baú fora do chunk dono`);
        const id = r.data[(c.x - cx * CHUNK) + (c.z - cz * CHUNK) * CHUNK + c.y * CHUNK * CHUNK];
        if (id !== B.chest) bad(`${g.id}: baú registrado sem bloco de baú em ${c.x},${c.y},${c.z}`);
      }
      solid.set(`${cx},${cz}`, r.data);
    }
  }
  const at = (x: number, y: number, z: number) => {
    const d = solid.get(`${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`);
    return d ? d[(((x % CHUNK) + CHUNK) % CHUNK) + (((z % CHUNK) + CHUNK) % CHUNK) * CHUNK + y * CHUNK * CHUNK] : 0;
  };
  for (const [i, s] of map.spawns.entries()) {
    const x = Math.floor(s.x);
    const z = Math.floor(s.z);
    const y = Math.floor(s.y);
    if (y >= WORLD_H - 3 || y < 1) bad(`${g.id}: ponto de partida ${i} fora da altura`);
    if (at(x, y - 1, z) === B.air) bad(`${g.id}: ponto de partida ${i} sem chão (${x},${y - 1},${z})`);
    if (at(x, y, z) !== B.air && at(x, y, z) !== B.glass) bad(`${g.id}: ponto de partida ${i} dentro de bloco (${at(x, y, z)})`);
    if (at(x, y + 1, z) !== B.air && at(x, y + 1, z) !== B.glass) bad(`${g.id}: ponto de partida ${i} sem espaço para a cabeça`);
  }
  console.log(`${g.id}: ${chests} baús, ${map.spawns.length} partidas, ${(ms / ((cx1 - cx0 + 1) ** 2)).toFixed(1)} ms por chunk (máx ${maxMs.toFixed(0)} ms)`);
  if (g.id !== "build" && chests < 20) bad(`${g.id}: poucos baús`);
  if (map.spawns.length < g.max) bad(`${g.id}: menos pontos de partida (${map.spawns.length}) que jogadores (${g.max})`);
}
console.log(problems.size === 0 ? "NENHUM PROBLEMA" : [...problems].map(([m, c]) => ` ${c}× ${m}`).join("\n"));
