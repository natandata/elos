// Teste do motor de estratégias de retorno: `npx tsx scripts/retention-e2e.ts`
import { comebackXp, offerStatus, pickStrategy, type Signals } from "../src/lib/retention/strategy";

let fails = 0;
const ok = (cond: unknown, msg: string) => {
  if (!cond) {
    fails++;
    console.log("FALHOU:", msg);
  }
};
const eq = (a: unknown, b: unknown, msg: string) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)})`);

const today = "2026-10-26";
const base: Signals = {
  first_name: "Ana", role: "cria", signup: "2026-08-01", active_days: 20, active_days_30: 0, last_day: "2026-10-20",
  dev_streak: 0, dev_date: null, status_streak: 0, status_date: null, game_streak: 0, game_date: null,
  has_push: true, features: {}, games: {}, last_offer: null, elo_at_risk: 0,
};

eq(comebackXp("em_risco"), 2, "XP de presente por sumiço (3 a 6 dias)");
eq(comebackXp("dormente"), 3, "XP 7 a 13 dias");
eq(comebackXp("perdido"), 5, "XP 14+ dias");

// líder
const leader = pickStrategy({ ...base, role: "leader", elo_at_risk: 4 }, "em_risco", today);
eq(leader.id, "leader_team", "líder recebe a estratégia do Elo");
ok(leader.pushBody.includes("4"), "texto do líder cita quantos do Elo estão sumidos");

// sequências quebradas (a mais valiosa é o devocional, depois check-in, depois jogos)
eq(pickStrategy({ ...base, dev_streak: 9, dev_date: "2026-10-20" }, "em_risco", today).id, "streak_devotional", "sequência de devocional quebrada");
eq(pickStrategy({ ...base, status_streak: 5, status_date: "2026-10-18" }, "dormente", today).id, "streak_status", "sequência de check-in quebrada");
eq(pickStrategy({ ...base, game_streak: 4, game_date: "2026-10-15" }, "dormente", today).id, "streak_games", "sequência de jogos quebrada");
eq(pickStrategy({ ...base, dev_streak: 2, dev_date: "2026-10-20" }, "em_risco", today).id !== "streak_devotional", true, "sequência curta (2) não conta");
eq(pickStrategy({ ...base, dev_streak: 9, dev_date: "2026-08-01" }, "perdido", today).id !== "streak_devotional", true, "sequência muito antiga não conta");
eq(pickStrategy({ ...base, dev_streak: 9, dev_date: "2026-10-25" }, "em_risco", today).id !== "streak_devotional", true, "sequência de ontem ainda não quebrou");

// quase sem histórico
eq(pickStrategy({ ...base, active_days: 1 }, "em_risco", today).id, "first_steps", "poucos dias de uso = primeiro passo");
eq(pickStrategy({ ...base, active_days: 0, last_day: null }, "perdido", today).id, "first_steps", "nunca abriu = primeiro passo");

// jogo favorito e hábitos
const fav = pickStrategy({ ...base, games: { quiz: 12, arena: 3, conteudo: 50 }, features: { status: 5 } }, "em_risco", today);
eq(fav.id, "favorite_game", "jogo mais jogado vira estratégia");
ok(fav.ctaHref === "/app/jogos/quiz" && fav.pushBody.length > 0 && fav.title.includes("Quiz do Dia"), "aponta para o jogo certo e ignora 'conteudo' como jogo");
eq(pickStrategy({ ...base, features: { post: 8, like: 20 } }, "dormente", today).id, "social_elogram", "quem vive no Elogram");
eq(pickStrategy({ ...base, features: { chat: 15 } }, "dormente", today).id, "social_chat", "quem vive no chat");
eq(pickStrategy({ ...base, features: { devotional: 9 } }, "dormente", today).id, "habit_devotional", "hábito do devocional");
eq(pickStrategy({ ...base, features: { status: 9 } }, "dormente", today).id, "habit_status", "hábito do check-in");
eq(pickStrategy(base, "perdido", today).id, "general", "sem padrão = convite geral");

// textos e avisos
const lost = pickStrategy(base, "perdido", today);
ok(lost.giftTitle.includes("faz tempo"), "tom de quem sumiu há mais de 14 dias");
ok(lost.xp === 5 && !lost.note, "perdido = 5 XP e sem aviso quando tem push");
ok(!!pickStrategy({ ...base, has_push: false }, "em_risco", today).note, "sem push: avisa o admin");
ok(pickStrategy({ ...base, first_name: "" }, "em_risco", today).pushTitle.includes("amigo"), "sem nome usa 'amigo'");
for (const f of [leader, fav, lost]) ok(f.pushTitle.length <= 120 && f.pushBody.length <= 200 && f.giftBody.length <= 400, "textos cabem nos limites do banco");

// acompanhamento do resultado
eq(offerStatus(base, today), null, "sem oferta, sem status");
const o = (over: object) => ({ ...base, last_offer: { created_at: "2026-10-24T15:00:00Z", claimed_at: null, shown_at: null, push: "sent", strategy: "general", reward_xp: 3, ...over } });
const waiting = offerStatus(o({}), today)!;
ok(waiting.tone === "warn" && waiting.blocked && waiting.label.includes("aguardando"), "ativada e sem abrir: aguardando e bloqueia nova ativação");
ok(offerStatus(o({ shown_at: "2026-10-25T10:00:00Z" }), today)!.tone === "good", "abriu o app: resultado bom");
ok(offerStatus(o({ shown_at: "x", claimed_at: "2026-10-25T10:00:00Z" }), today)!.label.includes("resgatou"), "resgatou o presente");
eq(offerStatus(o({ created_at: "2026-10-10T15:00:00Z" }), today)!.blocked, false, "depois de 7 dias pode ativar de novo");
ok(offerStatus(o({ push: "pending" }), today)!.label.includes("20h"), "aviso pendente informa o horário");

console.log(fails ? `\n${fails} falha(s)` : "Retenção OK");
process.exit(fails ? 1 : 0);
