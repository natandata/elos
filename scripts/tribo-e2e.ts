// Teste de ponta a ponta de A Última Tribo, sem navegador: um "jogador de mentira" joga partidas inteiras
// (pula do avião, saqueia, luta, cura, foge das Trevas) e o script confere a consistência a cada passo.
// Rodar: npx tsx scripts/tribo-e2e.ts [partidas]
import { CONSUMABLES, WEAPONS } from "../src/lib/ultimatribo/data/items";
import { Game, emptyInput, type Actor, type Difficulty } from "../src/lib/ultimatribo/sim";
import { HALF, blocked, findPath } from "../src/lib/ultimatribo/world";

const runs = Number(process.argv[2] ?? 12);
const problems = new Map<string, number>();
const bad = (msg: string) => problems.set(msg, (problems.get(msg) ?? 0) + 1);

function check(g: Game, tag: string) {
  for (const a of g.actors) {
    for (const k of ["x", "z", "y", "yaw", "hp", "hunger", "thirst", "energy", "boost", "vestHp", "helmHp", "bloom", "cooldown"] as const) if (!Number.isFinite(a[k])) bad(`${tag}: ${k} não é número (${a.name})`);
    if (a.where !== "plane" && (Math.abs(a.x) > HALF || Math.abs(a.z) > HALF)) bad(`${tag}: fora do mapa`);
    if (a.alive && (a.hp > 100.001 || a.hp <= 0)) bad(`${tag}: vida fora do limite (${a.hp.toFixed(1)})`);
    if (a.y < -0.001) bad(`${tag}: abaixo do chão`);
    if (a.where === "ground" && a.alive) for (const b of g.world.boxes) if (a.x > b.x0 + 0.05 && a.x < b.x1 - 0.05 && a.z > b.z0 + 0.05 && a.z < b.z1 - 0.05) bad(`${tag}: dentro de construção`);
    a.guns.forEach((gun) => {
      if (!gun) return;
      const wp = WEAPONS[gun.id];
      if (!wp) return bad(`${tag}: arma desconhecida ${gun.id}`);
      if (gun.mag < 0 || gun.mag > wp.mag) bad(`${tag}: pente fora do limite`);
    });
    for (const k of ["bala", "cartucho", "flecha"] as const) if (a.ammo[k] < 0) bad(`${tag}: munição negativa`);
    for (const id in a.inv) {
      if (!CONSUMABLES[id]) bad(`${tag}: item desconhecido na mochila (${id})`);
      if (a.inv[id] <= 0 || !Number.isInteger(a.inv[id])) bad(`${tag}: quantidade inválida de ${id}`);
    }
    if (a.grenades < 0) bad(`${tag}: granadas negativas`);
    if (g.carried(a) > g.capacity(a)) bad(`${tag}: mochila acima da capacidade`);
    if (a.gear.colete === 0 && a.vestHp > 0) bad(`${tag}: colete sem nível mas com durabilidade`);
    if (!a.alive && a.place < 1) bad(`${tag}: morto sem colocação`);
  }
  if (!Number.isFinite(g.dark.r) || g.dark.r < 0) bad(`${tag}: raio das Trevas inválido`);
}

function play(seed: number, bots: number, difficulty: Difficulty, style: "ativo" | "parado" | "caotico") {
  const g = new Game(seed, "Robô", 0x445566, { bots, difficulty });
  const p = g.player;
  const tag = `seed ${seed} ${difficulty} ${bots}b ${style}`;
  let path: [number, number][] = [];
  let repath = 0;
  let landed = -1;
  let stuckT = 0;
  let dodge = 0;
  let lx = 0;
  let lz = 0;
  const seen = { fall: false, loot: false, shot: false, heal: false, crouch: false, grenade: false, airdrop: false };
  let r = seed;
  const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const dt = 1 / 30;
  let steps = 0;
  while (!g.over && g.time < 720) {
    const inp = emptyInput();
    inp.yaw = p.yaw;
    if (p.where === "plane") {
      // o jogador "parado" nunca aperta nada: o jogo precisa tirá-lo do avião sozinho
      if (style !== "parado" && g.plane.t / g.plane.dur > 0.2 + (seed % 5) * 0.12) inp.jump = true;
    } else if (p.where === "fall" && style === "parado") {
      seen.fall = true;
    } else if (p.where === "fall") {
      seen.fall = true;
      // dirige para a caixa mais perto
      const c = g.world.containers.reduce((b, k) => (Math.hypot(k.x - p.x, k.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? k : b));
      inp.yaw = Math.atan2(c.x - p.x, c.z - p.z);
      inp.mz = 1;
    } else if (style !== "parado") {
      if (landed < 0) landed = g.time;
      // ---- inimigo à vista?
      let enemy: Actor | null = null;
      let ed = 45;
      for (const o of g.actors) {
        if (o === p || !o.alive || o.where !== "ground" || g.allies(o, p)) continue;
        const d = Math.hypot(o.x - p.x, o.z - p.z);
        if (d < ed && !blocked(g.world, p.x, p.z, o.x, o.z)) {
          ed = d;
          enemy = o;
        }
      }
      const wp = g.weaponOf(p);
      const gun = p.guns.findIndex((s) => s && (s.mag > 0 || p.ammo[WEAPONS[s.id].ammo!] > 0));
      if (gun >= 0 && p.active !== gun + 1) inp.slot = (gun + 1) as 1 | 2;
      else if (gun < 0 && p.active !== 0) inp.slot = 0;
      const safe = Math.hypot(p.x - g.dark.tx, p.z - g.dark.tz) < Math.max(4, g.dark.tr - 6);
      let goal: [number, number] | null = null;
      if (!safe) goal = [g.dark.tx, g.dark.tz];
      if (enemy && (safe || ed < 12)) {
        inp.yaw = Math.atan2(enemy.x - p.x, enemy.z - p.z);
        if (wp.kind === "melee") {
          inp.mz = 1;
          inp.fire = ed < wp.range;
        } else {
          inp.fire = steps % 3 !== 0; // solta o gatilho de vez em quando (armas semiautomáticas)
          inp.ads = ed > 15;
          if (ed > 18 && !seen.crouch) {
            inp.crouch = p.stance !== 1;
            seen.crouch = true;
          }
          if (p.grenades && ed > 10 && ed < 22 && rnd() < 0.02) {
            inp.grenade = true;
            seen.grenade = true;
          }
          seen.shot = true;
        }
        goal = null;
      } else {
        if (p.stance !== 0 && rnd() < 0.05) inp.jump = true;
        if (p.hp < 70 && g.countGroup(p, "med")) {
          inp.use = "med";
          seen.heal = true;
        } else if (p.hp < 95 && p.boost < 10 && g.countGroup(p, "boost")) inp.use = "boost";
        else if (p.thirst < 50 && g.countGroup(p, "drink")) inp.use = "drink";
        else if (p.hunger < 50 && g.countGroup(p, "food")) inp.use = "food";
        if (!goal) {
          let best: { x: number; z: number; kind: string } | null = null;
          let bd = 1e9;
          for (const c of g.world.containers) {
            if (c.opened || (c.y ?? 0) > 0.5 || g.inDark(c.x, c.z)) continue;
            if (Math.hypot(c.x - g.dark.tx, c.z - g.dark.tz) > g.dark.tr - 4) continue;
            const d = Math.hypot(c.x - p.x, c.z - p.z);
            if (d < bd) {
              bd = d;
              best = c;
            }
          }
          if (best) {
            goal = [best.x, best.z];
            if (bd < 2.6) {
              inp.interact = true;
              seen.loot = true;
              if (best.kind === "airdrop") seen.airdrop = true;
            }
          }
        }
      }
      if (goal) {
        repath -= dt;
        if (repath <= 0 || !path.length) {
          path = findPath(g.world, p.x, p.z, goal[0], goal[1]);
          repath = 1.2;
        }
        while (path.length && Math.hypot(path[0][0] - p.x, path[0][1] - p.z) < 1.3) path.shift();
        if (path[0]) {
          inp.yaw = Math.atan2(path[0][0] - p.x, path[0][1] - p.z);
          inp.mz = 1;
          inp.sprint = !safe;
        }
      }
      if (style === "caotico") {
        // aperta tudo sem critério: nada pode quebrar
        if (rnd() < 0.03) inp.jump = true;
        if (rnd() < 0.02) inp.crouch = true;
        if (rnd() < 0.02) inp.prone = true;
        if (rnd() < 0.03) inp.reload = true;
        if (rnd() < 0.03) inp.grenade = true;
        if (rnd() < 0.05) inp.slot = Math.floor(rnd() * 3) as 0 | 1 | 2;
        if (rnd() < 0.05) inp.use = (["food", "drink", "med", "boost"] as const)[Math.floor(rnd() * 4)];
        if (rnd() < 0.1) inp.interact = true;
        if (rnd() < 0.2) inp.fire = true;
        inp.ads = rnd() < 0.3;
        inp.mx = rnd() * 2 - 1;
      }
      if (dodge > 0) {
        dodge -= dt;
        inp.mx = 1;
      }
      // travou? registra
      stuckT += dt;
      if (stuckT > 4) {
        if (style === "ativo" && inp.mz > 0 && Math.hypot(p.x - lx, p.z - lz) < 0.6 && !p.using) {
          bad(`${tag}: jogador travado em (${p.x.toFixed(0)}, ${p.z.toFixed(0)})`);
          path = [];
          dodge = 0.8;
        }
        stuckT = 0;
        lx = p.x;
        lz = p.z;
      }
    }
    g.update(dt, inp);
    if (steps % 15 === 0) check(g, tag);
    g.ev.length = 0;
    steps++;
  }
  check(g, tag);
  if (!g.over) bad(`${tag}: a partida não terminou em 12 minutos`);
  else {
    const o = g.over;
    if (o.won !== (o.place === 1)) bad(`${tag}: vitória e colocação não batem`);
    if (o.place < 1 || o.place > o.players) bad(`${tag}: colocação fora do limite`);
    if (o.won && g.alive !== 1) bad(`${tag}: venceu com mais de um vivo`);
  }
  const places = g.actors.filter((a) => !a.alive).map((a) => a.place);
  if (new Set(places).size !== places.length) bad(`${tag}: colocações repetidas`);
  if (style === "ativo" && landed > 40) bad(`${tag}: demorou ${landed.toFixed(0)}s para pousar`);
  if (g.time > 60 && g.actors.some((a) => a.where !== "ground" && a.alive)) bad(`${tag}: alguém ficou no ar ou no avião até o fim`);
  return { g, seen, landed };
}

const diffs: Difficulty[] = ["facil", "normal", "dificil"];
const agg = { wins: 0, places: [] as number[], kills: 0, time: 0, fall: 0, loot: 0, shot: 0, heal: 0, grenade: 0, airdrop: 0 };
const t0 = Date.now();
for (let i = 0; i < runs; i++) {
  const style = i % 6 === 4 ? "parado" : i % 6 === 5 ? "caotico" : "ativo";
  const { g, seen } = play(1000 + i * 7919, [5, 9, 15][i % 3], diffs[i % 3], style);
  const o = g.over;
  if (o) {
    agg.wins += o.won ? 1 : 0;
    agg.places.push(o.place);
    agg.kills += o.kills;
    agg.time += o.seconds;
  }
  for (const k of ["fall", "loot", "shot", "heal", "grenade", "airdrop"] as const) agg[k] += seen[k] ? 1 : 0;
}
console.log(`${runs} partidas em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`vitórias ${agg.wins} · colocações ${agg.places.join(",")} · eliminações ${agg.kills} · duração média ${(agg.time / runs).toFixed(0)}s`);
console.log(`cobertura: paraquedas ${agg.fall} · saque ${agg.loot} · tiro ${agg.shot} · cura ${agg.heal} · granada ${agg.grenade} · caixa aérea ${agg.airdrop}`);
if (problems.size === 0) console.log("NENHUM PROBLEMA");
else for (const [m, n] of [...problems].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`PROBLEMA x${n}: ${m}`);
