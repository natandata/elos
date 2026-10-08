// Confere o conteúdo extra dos jogos (temporário): lacunas, duplicatas, contagem por nível.
import { QUIZ, VERSES, WHO, ORDER } from "../src/lib/games/content";

const isWord = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);
const count = (arr: { d: number }[]) => [1, 2, 3].map((d) => arr.filter((i) => i.d === d).length).join("/");
let problems = 0;
const bad = (msg: string) => {
  problems++;
  console.log("PROBLEMA:", msg);
};

for (const q of QUIZ) {
  const all = [q.a, ...q.w];
  if (new Set(all).size !== 4) bad(`quiz opções repetidas: ${q.q}`);
  if (q.q.length > 140) bad(`quiz pergunta longa: ${q.q}`);
}
const quizQs = QUIZ.map((q) => q.q);
if (new Set(quizQs).size !== quizQs.length) bad("quiz com pergunta repetida: " + quizQs.filter((x, i) => quizQs.indexOf(x) !== i).join(" | "));

for (const v of VERSES) {
  const full = `${v.before} ${v.a} ${v.after}`;
  if (new Set([v.a, ...v.w]).size !== 4) bad(`versículo opções repetidas: ${v.ref} ${v.a}`);
  for (const w of v.w) if (full.includes(` ${w} `) ) bad(`distrator aparece no texto: ${v.ref} ${v.a} -> ${w}`);
  const rest = `${v.before} ${v.after}`;
  const re = new RegExp(`(?<![\\p{L}])${v.a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "u");
  if (re.test(rest)) console.log("aviso (resposta aparece de novo no texto):", v.ref, v.a);
  const idx = full.indexOf(v.a);
  if (isWord(full[idx - 1]) && v.before) bad(`lacuna cortando palavra: ${v.ref} ${v.a}`);
}
const keys = WHO.map((w) => w.key);
if (new Set(keys).size !== keys.length) bad("who com key repetida: " + keys.filter((x, i) => keys.indexOf(x) !== i).join(", "));
const names = WHO.map((w) => w.name);
if (new Set(names).size !== names.length) bad("who com nome repetido: " + names.filter((x, i) => names.indexOf(x) !== i).join(", "));
for (const w of WHO) if (w.hints.some((h) => !h || h.length < 8)) bad(`who dica curta: ${w.key}`);
for (const o of ORDER) {
  if (new Set(o.events).size !== 4) bad(`ordem com evento repetido: ${o.title}`);
}
const titles = ORDER.map((o) => o.title);
if (new Set(titles).size !== titles.length) console.log("aviso: títulos de ordem repetidos:", titles.filter((x, i) => titles.indexOf(x) !== i).join(" | "));

console.log("quiz", QUIZ.length, count(QUIZ), "| versículos", VERSES.length, count(VERSES), "| quem sou eu", WHO.length, count(WHO), "| ordene", ORDER.length, count(ORDER));
console.log(problems ? `${problems} PROBLEMAS` : "OK");
