// Cartas da campanha (client-safe): os 8 personagens do ELOS. Só existem no modo Campanha da Arena dos Heróis.
import type { ArenaCard } from "./cards";

export const CAMPAIGN_CARDS: ArenaCard[] = [
  { key: "amandinha", name: "Amandinha", emoji: "🐿️", art: true, kind: "unit", cost: 3, count: 3, desc: "Chega com os bichinhos da floresta: três de uma vez, rápidos e ágeis.", hp: 78, dmg: 17, atkSpeed: 0.85, range: 0.8, speed: 1.9, radius: 0.4 },
  { key: "mbappe", name: "Mbappé", emoji: "⚡", art: true, kind: "unit", cost: 3, desc: "Velocíssimo: corre até a batalha e acerta rápido.", hp: 190, dmg: 36, atkSpeed: 0.9, range: 0.9, speed: 2.3, radius: 0.45 },
  { key: "nery", name: "Nery", emoji: "🪖", art: true, kind: "unit", cost: 5, desc: "Sargento firme: muita vida, e o apito deixa os inimigos lentos.", hp: 520, dmg: 34, atkSpeed: 1.3, range: 0.9, speed: 1.1, radius: 0.6, hitSlow: { amount: 0.3, secs: 2 } },
  { key: "henrique", name: "Henrique", emoji: "🎸", art: true, kind: "unit", cost: 4, desc: "O solo de guitarra acerta em área, de longe, até quem voa.", hp: 220, dmg: 34, atkSpeed: 1.3, range: 4.5, speed: 1.3, radius: 0.5, canHitAir: true, splash: 1.0 },
  { key: "tiaaline", short: "Tia Aline", name: "Tia Aline", emoji: "📚", art: true, kind: "unit", cost: 4, desc: "Joga livros de longe e cuida dos aliados por perto.", hp: 280, dmg: 22, atkSpeed: 1.2, range: 3.5, speed: 1.3, radius: 0.5, canHitAir: true, heal: { amount: 45, secs: 2, radius: 3.5 } },
  { key: "marcelinho", name: "Marcelinho", emoji: "🎒", art: true, kind: "unit", cost: 4, desc: "Chega com disposição e derruba muros: muito dano em construções.", hp: 330, dmg: 36, atkSpeed: 1.1, range: 0.9, speed: 1.6, radius: 0.5, unitTowerMult: 1.6 },
  { key: "natanrebeca", short: "Natan e Rebeca", name: "Natan e Rebeca", emoji: "💍", art: true, kind: "unit", cost: 6, count: 2, desc: "O casal luta junto: dois de uma vez, acertam em área e se cuidam.", hp: 300, dmg: 38, atkSpeed: 1.2, range: 1.0, speed: 1.4, radius: 0.55, splash: 0.9, heal: { amount: 30, secs: 2, radius: 3 } },
  { key: "zepa", short: "Pastor Zepa", name: "Pastor Zepa", emoji: "📖", art: true, kind: "unit", cost: 7, desc: "O mais forte: a Palavra acerta em área, derruba muros e cura os aliados.", hp: 900, dmg: 70, atkSpeed: 1.2, range: 1.5, speed: 1.3, radius: 0.65, canHitAir: true, splash: 1.2, unitTowerMult: 1.2, heal: { amount: 60, secs: 2, radius: 5 } },
];

export const CAMPAIGN_KEYS = new Set(CAMPAIGN_CARDS.map((c) => c.key));
