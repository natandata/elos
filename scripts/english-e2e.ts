// Teste do Inglês em Ação (sem navegador nem banco): `npx tsx scripts/english-e2e.ts`
import { ALL_EXERCISES, LESSONS, ROLEPLAYS, UNITS, legendaryExercises, listeningPool, placementExercises, placementUnit, wordCards } from "../src/lib/english/content";
import { distance, gradeBank, gradeRoleplayTyped, gradeTyped, lessonStars, normalize, requeue, roleplayReport, seededShuffle } from "../src/lib/english/grade";
import type { Exercise } from "../src/lib/english/types";

let fails = 0;
const ok = (cond: unknown, msg: string) => {
  if (!cond) {
    fails++;
    console.log("FALHOU:", msg);
  }
};
const eq = (a: unknown, b: unknown, msg: string) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)})`);

// ---------------------------------------------------------------- correção
eq(normalize("  Hello,  MY   friend! "), "hello my friend", "normalize básico");
eq(normalize("I’m fine"), "i'm fine", "aspas curvas");
eq(distance("kitten", "sitting"), 3, "distância");
ok(gradeTyped("my name is ana", ["My name is Ana"]).ok, "ignora maiúsculas");
ok(gradeTyped("My name is Ana.", ["My name is Ana"]).ok, "ignora ponto final");
const typo = gradeTyped("Good afternon", ["Good afternoon"]);
ok(typo.ok && typo.typo, "erro de digitação de 1 letra vale, com aviso");
ok(!gradeTyped("Hi", ["Hello"]).ok, "palavras curtas diferentes não passam");
ok(!gradeTyped("", ["Hello"]).ok, "vazio não passa");
ok(!gradeTyped("Good night", ["Good morning"]).ok, "resposta errada não passa");
ok(gradeBank(["Good", "morning"], ["Good morning"]).ok, "banco de palavras certo");
ok(!gradeBank(["morning", "Good"], ["Good morning"]).ok, "ordem errada não passa");
eq(lessonStars(0), 3, "3 estrelas");
eq(lessonStars(3), 2, "2 estrelas");
eq(lessonStars(9), 1, "1 estrela");
const shuf1 = seededShuffle([1, 2, 3, 4, 5, 6], "x");
eq(seededShuffle([1, 2, 3, 4, 5, 6], "x"), shuf1, "embaralhar é estável");
eq([...shuf1].sort(), [1, 2, 3, 4, 5, 6], "embaralhar não perde itens");

// ---------------------------------------------------------------- conteúdo
const ids = new Set<string>();
let total = 0;
for (const u of UNITS) {
  ok(u.lessons.length === 3, `unidade ${u.n} tem 3 lições`);
  for (const l of u.lessons) {
    ok(l.exercises.length >= 5, `${l.id} tem pelo menos 5 exercícios (${l.exercises.length})`);
    for (const e of l.exercises) {
      total++;
      ok(!ids.has(e.id), `id repetido ${e.id}`);
      ids.add(e.id);
      ok(e.ex && e.ex.length > 8, `${e.id} sem explicação`);
      if (e.k === "mc") {
        ok(e.opts.length >= 3 && e.opts.length <= 5, `${e.id} opções`);
        ok(e.a >= 0 && e.a < e.opts.length, `${e.id} índice da resposta`);
        ok(new Set(e.opts).size === e.opts.length, `${e.id} opções repetidas`);
        if (e.why) {
          ok(e.why.length === e.opts.length, `${e.id} why com o tamanho das opções`);
          ok(e.why[e.a] === null, `${e.id} a opção certa não leva "why"`);
        }
      }
      if (e.k === "tr") {
        ok(e.ans.length > 0, `${e.id} sem respostas`);
        const bank = new Set(e.bank.map((w) => normalize(w)));
        // só a resposta principal precisa ser montável com o banco; as variações (ex.: formas curtas) valem se alguém digitar
        for (const w of normalize(e.ans[0]).split(" ")) ok(bank.has(w), `${e.id}: a palavra "${w}" da resposta principal "${e.ans[0]}" não está no banco`);
        ok(gradeBank(normalize(e.ans[0]).split(" "), e.ans).ok, `${e.id} a resposta montada passa`);
      }
      if (e.k === "ty" || e.k === "ls") {
        ok(e.ans.length > 0, `${e.id} sem respostas`);
        ok(gradeTyped(e.ans[0], e.ans).ok, `${e.id} a resposta-modelo passa`);
      }
      if (e.k === "mt") ok(e.pairs.length === 4, `${e.id} 4 pares`);
    }
  }
}
console.log(`unidades: ${UNITS.length} · lições: ${Object.keys(LESSONS).length} · exercícios: ${total}`);

// ---------------------------------------------------------------- nivelamento, cartas, ouvir, lendário
const pl = placementExercises();
eq(pl.length, 8, "nivelamento com 8 perguntas");
eq([0, 2, 3, 5, 7, 8].map(placementUnit), [1, 1, 2, 3, 4, 4], "nivelamento -> unidade");
ok(wordCards().length >= 8, `cartas de palavras (${wordCards().length})`);
eq(listeningPool().length, 0, "sem exercícios de ouvir nas lições");
for (const u of UNITS) {
  const lg = legendaryExercises(u.n);
  ok(lg.length >= 8 && lg.length <= 10, `lendário da unidade ${u.n} (${lg.length})`);
  ok(lg.every((e) => !!ALL_EXERCISES[e.id]), `lendário ${u.n} usa exercícios reais`);
}

// fila com repetição dos erros
{
  const q: Exercise[] = UNITS[0].lessons[0].exercises.slice(0, 3);
  const retried = new Set<string>();
  let queue = q;
  queue = requeue(queue, 0, true, retried);
  eq(queue.length, 4, "erro volta ao fim da fila");
  queue = requeue(queue, 0, true, retried);
  eq(queue.length, 4, "o mesmo erro só volta uma vez");
  queue = requeue(queue, 1, false, retried);
  eq(queue.length, 4, "acerto não repete");
}

// ---------------------------------------------------------------- conversas
for (const r of ROLEPLAYS) {
  ok(r.turns.length === 5, `${r.id} tem 5 falas`);
  ok(UNITS.some((u) => u.n === r.unit && u.roleplay === r.id), `${r.id} ligado à unidade ${r.unit}`);
  for (const [i, t] of r.turns.entries()) {
    ok(!!t.options && t.options.length === 3, `${r.id}#${i} 3 opções`);
    ok(t.options!.filter((o) => o.q === 2).length === 1, `${r.id}#${i} uma opção ótima`);
    ok(t.options!.some((o) => o.q === 0), `${r.id}#${i} uma opção ruim`);
    ok(!!(t.ans?.length || t.re?.length), `${r.id}#${i} aceita resposta digitada`);
    ok(!!t.tip && !!t.model, `${r.id}#${i} dica e modelo`);
    const best = t.options!.find((o) => o.q === 2)!;
    eq(gradeRoleplayTyped(best.en, t), 2, `${r.id}#${i} a opção ótima digitada vale 2`);
    eq(gradeRoleplayTyped("banana", t), 0, `${r.id}#${i} resposta sem relação vale 0`);
    eq(gradeRoleplayTyped(t.model, t), 2, `${r.id}#${i} a frase-modelo vale 2`);
  }
}
{
  const t = ROLEPLAYS[0].turns[0];
  eq(gradeRoleplayTyped("My name is Julia", t), 2, "nome qualquer com padrão vale 2");
  eq(gradeRoleplayTyped("my name is", t), 1, "só 'my name' vale parcial");
  const turns = ROLEPLAYS[0].turns;
  const perfect = roleplayReport(turns, turns.map((tt, i) => ({ turn: i, reply: tt.model, q: 2 as const })));
  eq(perfect.accuracy, 100, "conversa perfeita = 100%");
  ok(perfect.complexity >= 40, `complexidade da conversa perfeita (${perfect.complexity})`);
  const weak = roleplayReport(turns, turns.map((tt, i) => ({ turn: i, reply: "ok", q: (i % 2 === 0 ? 0 : 1) as 0 | 1 })));
  ok(weak.accuracy < 40, `conversa fraca tem nota baixa (${weak.accuracy})`);
  ok(weak.tips.length > 0 && weak.phrases.length === 3, "conversa fraca gera dicas e 3 frases novas");
}

console.log(fails ? `\n${fails} falha(s)` : "\nTudo certo.");
process.exit(fails ? 1 : 0);
