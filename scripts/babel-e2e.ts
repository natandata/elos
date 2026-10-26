// Teste da economia e das ligas do Babel (sem navegador nem banco): `npx tsx scripts/babel-e2e.ts`
import { CHEST_IDX, GOALS, HEART_REGEN_MS, MAX_HEARTS, SHOP, dailyQuests, heartsNow, questProgress } from "../src/lib/babel/economy";
import { DEMOTE, GROUP_SIZE, PROMOTE, TIERS, rankStandings, settleOutcome, weekEndMs, weekMonday, weekStartMs, zones } from "../src/lib/babel/league";

let fails = 0;
const ok = (cond: unknown, msg: string) => {
  if (!cond) {
    fails++;
    console.log("FALHOU:", msg);
  }
};
const eq = (a: unknown, b: unknown, msg: string) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)})`);

// ---------------------------------------------------------------- corações
const t0 = Date.parse("2026-10-26T12:00:00Z");
eq(heartsNow(5, null, t0), { hearts: 5, nextAt: null }, "cheio não tem recarga");
eq(heartsNow(3, new Date(t0).toISOString(), t0 + 1000).hearts, 3, "sem tempo, sem recarga");
eq(heartsNow(3, new Date(t0).toISOString(), t0 + HEART_REGEN_MS).hearts, 4, "4 horas = +1");
eq(heartsNow(3, new Date(t0).toISOString(), t0 + 3 * HEART_REGEN_MS).hearts, MAX_HEARTS, "passa do teto = 5");
eq(heartsNow(0, new Date(t0).toISOString(), t0 + HEART_REGEN_MS * 2 + 5).hearts, 2, "0 + 2 recargas = 2");
eq(heartsNow(0, new Date(t0).toISOString(), t0).nextAt, t0 + HEART_REGEN_MS, "próxima recarga em 4 h");

// ---------------------------------------------------------------- missões
const q1 = dailyQuests("user-a", "2026-10-26");
const q2 = dailyQuests("user-a", "2026-10-26");
eq(q1.map((q) => q.id), q2.map((q) => q.id), "missões do dia são estáveis");
eq(q1.length, 3, "3 missões por dia");
ok(new Set(q1.map((q) => q.metric)).size === 3, "3 missões de tipos diferentes");
const days = new Set<string>();
for (let d = 1; d <= 20; d++) days.add(dailyQuests("user-a", `2026-10-${String(d).padStart(2, "0")}`).map((q) => q.id).join(","));
ok(days.size > 4, "as missões variam de um dia para o outro");
const q = q1[0];
eq(questProgress(q, { xp: 999, lessons: 999, perfects: 999, roleplays: 999, practices: 999 }), q.target, "progresso nunca passa da meta");
eq(questProgress(q, { xp: 0, lessons: 0, perfects: 0, roleplays: 0, practices: 0 }), 0, "progresso zero");
ok(CHEST_IDX > 2, "índice do baú não colide com as missões");
ok(GOALS.map((g) => g.xp).join() === "10,20,30,50", "metas diárias como no banco (10, 20, 30, 50)");
ok(SHOP.freeze.price === 100 && SHOP.refill.price === 80 && SHOP.boost.price === 50, "preços iguais aos do banco");

// ---------------------------------------------------------------- semana e liga
eq(weekMonday("2026-10-26"), "2026-10-26", "segunda é o início da semana");
eq(weekMonday("2026-10-25"), "2026-10-19", "domingo pertence à semana que começou na segunda anterior");
eq(weekMonday("2026-10-28"), "2026-10-26", "quarta");
ok(weekEndMs("2026-10-26") - weekStartMs("2026-10-26") === 7 * 86_400_000, "semana tem 7 dias");
eq(TIERS.length, 10, "10 divisões");
eq(GROUP_SIZE, 30, "grupo de 30");

const ranked = rankStandings([
  { id: "b", name: "B", avatar: null, xp: 10, me: false },
  { id: "me", name: "x", avatar: null, xp: 50, me: true },
  { id: "a", name: "A", avatar: null, xp: 10, me: false },
]);
eq(ranked[0].id, "me", "quem tem mais XP lidera");
eq(ranked.map((s) => s.id), ["me", "a", "b"], "empate desempata por id, ordem decrescente");
eq(zones(30), { promote: 10, demoteFrom: 26 }, "grupo cheio: 10 sobem, 5 descem");
eq(zones(9), { promote: 3, demoteFrom: 9 }, "grupo de 9: 3 sobem, 1 desce");
eq(zones(4), { promote: 1, demoteFrom: 5 }, "grupo de 4: 1 sobe, ninguém desce por posição");
eq(zones(1), { promote: 1, demoteFrom: 2 }, "sozinho: sem zona de descida");
eq(settleOutcome(1, 80, 3, 1), { newTier: 4, result: "promoted", gems: 0 }, "sozinho sobe mas sem gemas");
eq(settleOutcome(4, 80, 3, 4).result, "stayed", "grupo pequeno: último não desce por posição");
eq(settleOutcome(2, 0, 3, 4).result, "demoted", "0 XP desce mesmo em grupo pequeno");

// ---------------------------------------------------------------- subir e descer
eq(settleOutcome(1, 300, 1), { newTier: 2, result: "promoted", gems: 60 }, "1º sobe e ganha 60 gemas");
eq(settleOutcome(2, 200, 4).gems, 40, "2º ganha 40");
eq(settleOutcome(3, 150, 4).gems, 20, "3º ganha 20");
eq(settleOutcome(PROMOTE, 80, 1), { newTier: 2, result: "promoted", gems: 10 }, "10º sobe com 10 gemas");
eq(settleOutcome(PROMOTE + 1, 80, 3), { newTier: 3, result: "stayed", gems: 0 }, "11º fica");
eq(settleOutcome(GROUP_SIZE, 40, 3), { newTier: 2, result: "demoted", gems: 0 }, "último desce");
eq(settleOutcome(GROUP_SIZE - DEMOTE + 1, 40, 3).result, "demoted", "últimos 5 descem");
eq(settleOutcome(GROUP_SIZE - DEMOTE, 40, 3).result, "stayed", "26º fica");
eq(settleOutcome(GROUP_SIZE, 40, 1).result, "stayed", "no Bronze ninguém desce");
eq(settleOutcome(5, 0, 5), { newTier: 4, result: "demoted", gems: 0 }, "0 XP desce mesmo bem colocado");
eq(settleOutcome(5, 0, 1).result, "stayed", "0 XP no Bronze fica");
eq(settleOutcome(1, 500, 10), { newTier: 10, result: "stayed", gems: 60 }, "Diamante não sobe mais, mas ganha as gemas");

console.log(fails ? `\n${fails} falha(s)` : "Babel OK");
process.exit(fails ? 1 : 0);
