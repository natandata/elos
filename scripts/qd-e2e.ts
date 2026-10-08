// Teste sem navegador de Quem Desenha?: banco de palavras, conferência de palpites e partidas inteiras no anfitrião.
// Rodar: npx tsx scripts/qd-e2e.ts [partidas]
import { QdHost, type DrawOp, type ToClient } from "../src/lib/quemdesenha/host";
import { cleanSettings, drawChoices, drawerPoints, guessPoints, hintsShown, judgeGuess, maskOf, normalize } from "../src/lib/quemdesenha/rules";
import { CULTURES, WORDS, wordsFor, type Category, type Level } from "../src/lib/quemdesenha/words";

const problems = new Map<string, number>();
const bad = (m: string) => problems.set(m, (problems.get(m) ?? 0) + 1);
const ok = (c: boolean, m: string) => {
  if (!c) bad(m);
};

// ------------------------------------------------ banco
const seen = new Set<string>();
for (const w of WORDS) {
  ok(!seen.has(w.id), `id repetido ${w.id}`);
  seen.add(w.id);
  ok(w.hints[0].length > 3 && w.hints[1].length > 3, `pista vazia em ${w.text}`);
  ok(judgeGuess(w, w.text) === "certo", `a própria palavra não vale: ${w.text}`);
  for (const a of w.aliases) ok(judgeGuess(w, a) === "certo", `variação não vale: ${w.text} / ${a}`);
  ok(judgeGuess(w, "xyzxyzxyz") === "errado", `lixo valeu em ${w.text}`);
  // a pista não pode entregar a resposta
  const n = normalize(w.text);
  for (const h of w.hints) if (n.length >= 4 && ` ${normalize(h)} `.includes(` ${n} `)) bad(`pista entrega a resposta: ${w.text} -> ${h}`);
}
// uma palavra não pode aceitar como certo o texto de outra
// (as três exceções abaixo são intencionais: a mesma coisa nomeada de dois jeitos)
const SAME = new Set(["Arca de Noé>Arca", "Mar Vermelho>Travessia do Mar Vermelho", "Santa Ceia>Última Ceia"]);
for (const a of WORDS) for (const b of WORDS) if (a !== b && judgeGuess(a, b.text) === "certo" && !SAME.has(`${b.text}>${a.text}`)) bad(`"${b.text}" vale como "${a.text}"`);
const cats: Category[] = ["personagens", "animais", "objetos", "lugares", "historias", "conceitos"];
const lvs: Level[] = ["facil", "medio", "dificil"];
console.log(`${WORDS.length} palavras`);
for (const c of CULTURES) {
  const l = wordsFor(c.key);
  console.log(` ${c.name}: ${l.length} (${lvs.map((x) => l.filter((w) => w.level === x).length).join("/")})`);
  ok(l.length >= 12, `cultura pequena: ${c.name} (${l.length})`);
}
console.log(" por categoria:", cats.map((c) => `${c} ${WORDS.filter((w) => w.category === c).length}`).join(", "));
let r = 7;
const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (const c of CULTURES)
  for (const cat of ["todas", ...cats] as const)
    for (const lv of ["mista", ...lvs] as const) {
      const ch = drawChoices(rnd, cleanSettings({ culture: c.key, category: cat, level: lv }), new Set());
      if (ch.length < 3) bad(`menos de 3 opções (${c.key}/${cat}/${lv}: ${ch.length})`);
      if (new Set(ch.map((w) => w.id)).size !== ch.length) bad("opções repetidas");
    }

// ------------------------------------------------ palpites e pontos
const davi = WORDS.find((w) => w.text === "Davi")!;
ok(judgeGuess(davi, "DAVI!") === "certo", "maiúsculas e pontuação");
ok(judgeGuess(davi, "Rei Davi") === "certo", "variação rei davi");
ok(judgeGuess(davi, "david") === "certo", "variação david");
ok(judgeGuess(davi, "golias") === "errado", "outra palavra não vale");
ok(judgeGuess(davi, "dav") === "quase", "quase");
const arca = WORDS.find((w) => w.text === "Arca de Noé")!;
ok(judgeGuess(arca, "a arca de noe") === "certo", "artigo e acento");
const sal = WORDS.find((w) => w.text === "Salvação")!;
ok(judgeGuess(sal, "salvacao") === "certo", "sem acento");
ok(judgeGuess(sal, "salvaao") === "certo", "erro de uma letra em palavra longa");
ok(guessPoints(5000, 60000, 0) === 100 && guessPoints(15000, 60000, 0) === 80 && guessPoints(25000, 60000, 0) === 60 && guessPoints(40000, 60000, 0) === 40 && guessPoints(55000, 60000, 0) === 20, "faixas de pontos");
ok(guessPoints(5000, 60000, 2) === 70, "pistas reduzem");
ok(guessPoints(1000, 30000, 0) === 100 && guessPoints(29000, 30000, 0) === 20, "faixas esticam");
ok(drawerPoints(5, 5) === 100 && drawerPoints(0, 5) === 0 && drawerPoints(1, 4) === 25, "pontos do desenhista");
ok(hintsShown(0, 60000) === 0 && hintsShown(20000, 60000) === 1 && hintsShown(40000, 60000) === 2, "pistas no tempo");
ok(maskOf("Jesus andando") === "_ _ _ _ _   _ _ _ _ _ _ _", "máscara");

// ------------------------------------------------ partidas
type Inbox = { states: number; secret: string | null; denied: string | null };
function play(seed: number, humans: number, bots: number, rounds: number, behavior: "normal" | "sai" | "mudo") {
  const tag = `seed ${seed} ${humans}h+${bots}b ${rounds}r ${behavior}`;
  const inbox = new Map<string, Inbox>();
  const ids = Array.from({ length: humans }, (_, i) => `u${i}`);
  for (const id of ids) inbox.set(id, { states: 0, secret: null, denied: null });
  const send = (to: string | string[] | null, msg: ToClient) => {
    const targets = to === null ? [...inbox.keys()] : Array.isArray(to) ? to : [to];
    for (const t of targets) {
      const b = inbox.get(t);
      if (!b) continue;
      if (msg.t === "state") b.states++;
      else if (msg.t === "secret") b.secret = msg.text;
      else if (msg.t === "deny") b.denied = msg.reason;
    }
  };
  const host = new QdHost("ABCD", ids[0], "Anfitrião", seed, send, { rounds, bots, drawSeconds: 45 });
  for (const id of ids.slice(1)) host.handle(id, { t: "hello", name: `J${id}` });
  host.handle(ids[0], { t: "start" });
  const seenScore = new Map<string, number>();
  let g = 1;
  const rr = () => ((g = (g * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff);
  let steps = 0;
  let left = false;
  const turnsSeen = new Set<number>();
  while (host.phase !== "end" && steps < 200000) {
    const s = host.snapshot();
    const d = s.drawerId;
    // como no jogo de verdade, cada aparelho avisa que continua ali
    if (steps % 30 === 0) for (const id of ids) if (!(left && id === ids[ids.length - 1])) host.handle(id, { t: "ping" });
    if (host.phase === "choosing" && d && behavior !== "mudo" && rr() < 0.5) host.handle(d, { t: "pick", i: Math.floor(rr() * 3) });
    if (host.phase === "drawing") {
      turnsSeen.add(s.turn);
      if (d && rr() < 0.3) {
        host.handle(d, { t: "op", k: "s", c: "#ff0000", w: 5, x: rr(), y: rr() });
        host.handle(d, { t: "op", k: "p", p: [rr(), rr(), rr(), rr()] });
        host.handle(d, { t: "op", k: "e" });
      }
      const w = host.currentWord!;
      for (const id of ids) {
        if (id === d || behavior === "mudo") continue;
        if (rr() < 0.012) host.handle(id, { t: "guess", text: rr() < 0.1 ? w.text : rr() < 0.5 ? "teste errado" : "dav" });
      }
      if (behavior === "sai" && !left && s.turn === 1 && ids.length > 2) {
        left = true;
        host.handle(ids[ids.length - 1], { t: "bye" });
      }
    }
    host.tick(100);
    steps++;
    const sn = host.snapshot();
    for (const p of sn.players) {
      ok(Number.isFinite(p.score) && p.score >= 0, `${tag}: placar inválido`);
      if ((seenScore.get(p.id) ?? 0) > p.score) bad(`${tag}: placar de ${p.id} diminuiu`);
      seenScore.set(p.id, p.score);
    }
    if (sn.phase === "drawing") {
      ok(sn.word === null, `${tag}: palavra vazou no estado durante o desenho`);
      ok(!!sn.mask && sn.mask.includes("_"), `${tag}: sem máscara`);
      ok(sn.hints.length <= 2, `${tag}: pistas demais`);
      ok(sn.leftMs <= sn.totalMs + 1, `${tag}: tempo restante maior que o total`);
    }
    if (sn.phase === "choosing") ok(sn.word === null && sn.mask === null, `${tag}: vazou na escolha`);
    if (sn.phase === "reveal") ok(!!sn.word, `${tag}: revelação sem palavra`);
  }
  if (host.phase !== "end") bad(`${tag}: a partida não terminou`);
  const rank = host.ranking();
  ok(rank.length > 0 && rank[0].place === 1, `${tag}: ranking sem 1º`);
  for (let i = 1; i < rank.length; i++) ok(rank[i].score <= rank[i - 1].score, `${tag}: ranking fora de ordem`);
  const expectedTurns = humans * rounds;
  ok(host.snapshot().totalTurns === expectedTurns, `${tag}: total de vezes ${host.snapshot().totalTurns} diferente de ${expectedTurns}`);
  if (behavior !== "sai") ok(turnsSeen.size === expectedTurns, `${tag}: só ${turnsSeen.size} de ${expectedTurns} vezes desenhadas`);
  for (const id of ids) ok((inbox.get(id)?.states ?? 0) > 10, `${tag}: ${id} quase não recebeu estado`);
  return { total: rank.reduce((a, p) => a + p.score, 0) };
}

const runs = Number(process.argv[2] ?? 30);
let totalPts = 0;
for (let i = 0; i < runs; i++) {
  const humans = 1 + (i % 6);
  const bots = humans === 1 ? 3 : i % 3;
  const behavior = i % 7 === 3 ? "sai" : i % 7 === 5 ? "mudo" : "normal";
  totalPts += play(500 + i * 31, humans, bots, 1 + (i % 3), behavior).total;
}
console.log(`${runs} partidas · média ${(totalPts / runs).toFixed(0)} pontos por partida`);

// segurança: operações malformadas, palpite do desenhista, entrada tardia, sala cheia
{
  const got: ToClient[] = [];
  const h = new QdHost("ZZZZ", "a", "A", 1, (_t, m) => got.push(m), { maxPlayers: 3 });
  h.handle("b", { t: "hello", name: "B" });
  h.handle("c", { t: "hello", name: "C" });
  h.handle("d", { t: "hello", name: "D" });
  ok(got.some((m) => m.t === "deny" && m.reason.includes("cheia")), "sala cheia não negou");
  h.handle("b", { t: "start" });
  ok(h.phase === "lobby", "convidado iniciou a partida");
  h.handle("b", { t: "settings", settings: { rounds: 4 } });
  ok(h.settings.rounds !== 4, "convidado mexeu nos ajustes");
  h.handle("a", { t: "settings", settings: { rounds: 99, drawSeconds: 7, culture: "x" as never } });
  ok(h.settings.rounds === 4 && h.settings.drawSeconds === 60 && h.settings.culture === "biblia", "ajustes não foram limpos");
  h.handle("a", { t: "start" });
  ok(h.phase === "choosing", "não começou");
  h.handle("zz", { t: "hello", name: "Atrasado" });
  ok(got.some((m) => m.t === "deny" && m.reason.includes("começou")), "entrada tardia aceita");
  const dr = h.drawer!;
  const other = ["a", "b", "c"].find((x) => x !== dr)!;
  h.handle(other, { t: "pick", i: 0 });
  ok(h.phase === "choosing", "quem não desenha escolheu a palavra");
  h.handle(dr, { t: "pick", i: 9 });
  ok(h.phase === "choosing", "opção inexistente aceita");
  h.handle(dr, { t: "pick", i: 1 });
  ok(h.phase === "drawing", "pick válido não funcionou");
  const w = h.currentWord!;
  h.handle(dr, { t: "guess", text: w.text });
  ok(h.snapshot().players.every((p) => !p.guessed), "o desenhista acertou a própria palavra");
  h.handle(other, { t: "op", k: "s", c: "#000000", w: 3, x: 0.5, y: 0.5 });
  ok(h.opLog.length === 0, "quem não é desenhista desenhou");
  h.handle(dr, { t: "op", k: "s", c: "<script>", w: 9999, x: 7, y: -3 });
  const o = h.opLog[0] as Extract<DrawOp, { k: "s" }>;
  ok(!!o && o.w <= 40 && o.x <= 1 && o.y >= 0 && /^#[0-9a-f]{6}$/i.test(o.c), "operação suja passou");
  h.handle(dr, { t: "op", k: "h", sh: "star", c: "#ff0000", c2: "nope", f: "b", w: 500, x0: -1, y0: 0.2, x1: 9, y1: 0.8 });
  const sh = h.opLog[h.opLog.length - 1] as Extract<DrawOp, { k: "h" }>;
  ok(sh?.k === "h" && sh.sh === "star" && sh.w === 40 && sh.x0 === 0 && sh.x1 === 1 && sh.c2 === "#ffffff", "forma não foi limpa");
  h.handle(dr, { t: "op", k: "h", sh: "bomba" as never, c: "#000000", c2: "#000000", f: "o", w: 3, x0: 0, y0: 0, x1: 1, y1: 1 });
  ok(h.opLog.length === 2, "forma desconhecida entrou");
  h.handle(dr, { t: "op", k: "b", c: "#00ff00", x: 0.5, y: 0.5 });
  ok(h.opLog.length === 3 && h.opLog[2].k === "b", "balde não entrou");
  h.handle(dr, { t: "op", k: "s", c: "#000000", w: 5, x: 0.1, y: 0.1, b: "x" as never });
  ok((h.opLog[3] as Extract<DrawOp, { k: "s" }>).b === "l", "pincel desconhecido não virou lápis");
  h.handle(dr, { t: "op", k: "z" as never });
  ok(h.opLog.length === 4, "operação desconhecida entrou");
  h.handle(other, { t: "guess", text: w.text });
  ok(h.snapshot().players.find((p) => p.id === other)!.guessed, "acerto não contou");
  const before = h.snapshot().players.find((p) => p.id === other)!.score;
  h.handle(other, { t: "guess", text: w.text });
  ok(h.snapshot().players.find((p) => p.id === other)!.score === before, "pontuou duas vezes");
}

if (problems.size === 0) console.log("NENHUM PROBLEMA");
else for (const [m, n] of [...problems].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`PROBLEMA x${n}: ${m}`);
