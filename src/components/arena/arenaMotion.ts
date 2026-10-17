import type { Anim } from "./arenaFx";

// Movimento do corpo dos personagens da Arena (só visual): andar, parado, golpe e tranco.
// Funções puras: recebem o estado de animação e devolvem a pose do quadro. O motor do jogo nunca é tocado.
// Golpe em 3 tempos (como no Clash Royale): antecipação (recua e amassa) → golpe (avança e estica) → recuperação (volta com sobra).

/** Duração do golpe, em ticks (1/20 s). */
export const ATK_TICKS = 9;
/** Instante do golpe em que o dano "cai" (fração do golpe: o pico do avanço). */
export const STRIKE_AT = 0.45;

export type Body = {
  /** quanto recua antes de bater */
  wind: number;
  /** quanto avança ao bater */
  lunge: number;
  /** pulo no golpe */
  hop: number;
  /** peso: pesado amassa mais ao pisar e congela mais no impacto */
  weight: number;
  /** ticks de "hit-stop" (congelada) no impacto corpo a corpo */
  stop: number;
  /** deixa rastro (imagens residuais) no avanço */
  trail: boolean;
};

const DEFAULT_BODY: Body = { wind: 1, lunge: 1, hop: 0, weight: 1, stop: 1, trail: false };
const BODY: Record<string, Partial<Body>> = {
  sansao: { wind: 1.9, lunge: 1.25, hop: 0.45, weight: 1.8, stop: 3, trail: true }, // levanta a clava e desce com tudo
  daniel: { wind: 0.8, lunge: 1.5, hop: 0.1, weight: 1.2, stop: 2, trail: true }, // bote do leão
  joao: { wind: 0.6, lunge: 1.1, weight: 0.9, trail: true },
  gideao: { wind: 0.6, lunge: 0.8, weight: 0.9 },
  miguel: { wind: 1.1, lunge: 1.2, hop: 0.3, weight: 1.3, stop: 2 },
  josue: { wind: 1.4, lunge: 1.1, hop: 0.15, weight: 1.2, stop: 2 },
  noe: { wind: 1.2, lunge: 0.9, hop: 0.15, weight: 1.3, stop: 2 },
  adao: { wind: 1.1, lunge: 1.1, hop: 0.1 },
  jaco: { wind: 1.2, lunge: 1.15 },
  nabucodonosor: { wind: 1.5, lunge: 1.0, hop: 0.2, weight: 1.7, stop: 3 },
  // campanha
  nery: { wind: 1.2, lunge: 1.0, hop: 0.1, weight: 1.6, stop: 3 }, // tanque
  mbappe: { wind: 0.7, lunge: 1.3, weight: 0.7, stop: 1, trail: true }, // veloz
  zepa: { wind: 1.1, lunge: 1.0, weight: 1.3, stop: 2 },
  marcelinho: { wind: 1.0, lunge: 1.1, weight: 1.0 },
  natanrebeca: { wind: 1.0, lunge: 1.1, weight: 1.0, trail: true },
  henrique: { wind: 1.2, lunge: 1.0, hop: 0.2, weight: 1.1, stop: 2 },
  tiaaline: { wind: 0.9, lunge: 0.9, weight: 0.9 },
  amandinha: { wind: 0.7, lunge: 1.2, weight: 0.7, trail: true },
};

export const bodyOf = (card: string): Body => ({ ...DEFAULT_BODY, ...BODY[card] });

/** Tempo da animação com o "hit-stop" aplicado: durante a pausa o tempo fica parado, depois segue de onde parou. */
export function stopTime(an: Anim | undefined, t: number): number {
  if (!an || an.hsN <= 0 || t < an.hs0) return t;
  if (t < an.hs0 + an.hsN) return an.hs0;
  return t - an.hsN;
}

/** Marca uma pausa de impacto no personagem (ignora se ele já está numa). */
export function holdAt(an: Anim | undefined, at: number, ticks: number) {
  if (!an || ticks <= 0) return;
  if (an.hsN > 0 && at < an.hs0 + an.hsN + 10) return;
  an.hs0 = at;
  an.hsN = ticks;
}

export type Pose = {
  bob: number;
  sx: number;
  sy: number;
  sway: number;
  thrustX: number;
  thrustY: number;
  /** progresso do golpe 0–1, ou -1 fora do golpe */
  atkT: number;
  /** força do tranco 0–1 (1 = acabou de apanhar) */
  hitK: number;
  /** 0–1: intensidade do rastro de velocidade */
  trail: number;
  /** fase da caminhada (rad) */
  gait: number;
  moving: boolean;
};

type Input = {
  card: string;
  flying: boolean;
  id: number;
  /** pixels por unidade do campo */
  s: number;
  /** raio do personagem em pixels */
  r: number;
  tickF: number;
  an: Anim | undefined;
  spawnP: number;
};

/** A pose do quadro: andar, parado (respirando), golpe em 3 tempos e tranco. */
export function computePose(o: Input): Pose {
  const { an, s, r, tickF, id } = o;
  const body = bodyOf(o.card);
  const moving = !!an?.moving;
  const gait = (an?.walk ?? 0) * 3.6;
  const hop = Math.abs(Math.sin(gait));
  const breath = Math.sin(tickF * 0.16 + id);

  // andar: quica e se estica no ar, amassa ao pisar (o pesado amassa mais); parado: respira
  let bob = moving ? hop * 0.1 * r * 4 : breath * 0.02 * r * 4;
  let sx = moving ? 1 - (hop - 0.5) * 0.05 : 1 - breath * 0.012;
  let sy = moving ? 1 + (hop - 0.5) * 0.07 : 1 + breath * 0.02;
  if (moving) {
    const land = Math.pow(1 - hop, 5) * 0.045 * body.weight;
    sx *= 1 + land;
    sy *= 1 - land;
  }
  // inclina pro lado em que anda e alterna a cada passo
  let sway = moving ? Math.sin(gait) * 0.07 + (an?.face ?? 1) * 0.04 : Math.sin(tickF * 0.08 + id * 3) * 0.012;
  if (o.flying) {
    bob = Math.sin(tickF * 0.2 + id) * 0.16 * s;
    sx *= 1 + Math.sin(tickF * 0.9 + id) * 0.05; // bater de asas
    sy *= 1 - Math.sin(tickF * 0.9 + id) * 0.025;
  }
  // pousa: amassa quando termina a entrada
  if (o.spawnP > 0.75 && o.spawnP < 1) {
    const k = Math.sin(((o.spawnP - 0.75) / 0.25) * Math.PI);
    sx *= 1 + 0.12 * k;
    sy *= 1 - 0.12 * k;
  }

  let thrustX = 0;
  let thrustY = 0;
  let atkT = -1;
  let hitK = 0;
  let trail = 0;
  if (an) {
    const te = stopTime(an, tickF);
    const a = te - an.atk;
    if (a >= 0 && a < ATK_TICKS) {
      const t = a / ATK_TICKS;
      atkT = t;
      let off: number;
      if (an.ranged) {
        // à distância: puxa pra trás, solta e volta
        off = -0.24 * Math.sin(Math.min(1, t * 1.6) * Math.PI);
        sway += -0.1 * an.face * Math.sin(t * Math.PI);
        sx *= 1 - 0.05 * Math.sin(t * Math.PI);
        sy *= 1 + 0.05 * Math.sin(t * Math.PI);
      } else if (t < 0.28) {
        // antecipação: recua e amassa
        const u = t / 0.28;
        off = -0.22 * u * body.wind;
        sx *= 1 - 0.05 * u * body.weight;
        sy *= 1 + 0.06 * u;
        sway += -0.12 * an.face * u * body.wind;
        bob += body.hop * s * u;
      } else if (t < STRIKE_AT + 0.05) {
        // golpe: avança rápido e estica
        const u = (t - 0.28) / (STRIKE_AT + 0.05 - 0.28);
        const e3 = 1 - Math.pow(1 - u, 3);
        off = -0.22 * body.wind + (0.92 * body.lunge + 0.22 * body.wind) * e3;
        sx *= 1 + 0.12 * e3;
        sy *= 1 - 0.1 * e3;
        sway += 0.28 * an.face * e3 - 0.12 * an.face * body.wind * (1 - e3);
        bob += body.hop * s * (1 - e3);
        trail = body.trail ? e3 : 0;
      } else {
        // recuperação: volta com uma sobra (balança antes de assentar)
        const u = (t - (STRIKE_AT + 0.05)) / (1 - (STRIKE_AT + 0.05));
        const e2 = u * u * (3 - 2 * u);
        const settle = Math.sin(u * Math.PI * 2) * (1 - u) * 0.05 * body.weight;
        off = 0.7 * body.lunge * (1 - e2) + settle;
        sx *= 1 + 0.12 * (1 - e2);
        sy *= 1 - 0.1 * (1 - e2);
        sway += 0.28 * an.face * (1 - e2);
      }
      thrustX = an.atkDx * off * s;
      thrustY = an.atkDy * off * s * 0.7;
    }
    // apanhou: tranco pra trás, amassa e balança de volta
    const h = te - an.hit;
    if (h >= 0 && h < 8) {
      const k = 1 - h / 8;
      hitK = k;
      const push = (0.34 / Math.sqrt(body.weight)) * k * k * s;
      thrustX += an.hitDx * push;
      thrustY += an.hitDy * push * 0.7;
      sx *= 1 + 0.1 * k;
      sy *= 1 - 0.1 * k;
      sway += an.hitDx * 0.12 * k + Math.sin(h * 1.5) * 0.03 * k * an.hitDx;
    }
  }
  return { bob, sx, sy, sway, thrustX, thrustY, atkT, hitK, trail, gait, moving };
}
