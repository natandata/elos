// Habilidades especiais de personagens bíblicos (client-safe, sem DOM). O motor e a tela leem os mesmos números.

/** Noé: depois de `afterSecs` em campo, uma barca gigante bloqueia uma ponte (sorteada) por `blockSecs`. */
export const ARK = { card: "noe", afterSecs: 3, blockSecs: 10 };
/** João Batista: atravessa o rio mergulhando (só onde tem água: na ponte ele anda). */
export const SWIM = { card: "joao" };
/** Gideão: depois de `afterSecs` em campo, chegam mais `count` soldados que morrem com qualquer golpe. */
export const MUSTER = { card: "gideao", afterSecs: 4, count: 4, dmgFactor: 0.45 };
/** O Mar Vermelho não faz efeito em Moisés. */
export const SEA = { spell: "mar", immune: "moises" };
