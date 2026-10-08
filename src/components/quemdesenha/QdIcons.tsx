// Ícones personalizados do Quem Desenha? (desenhados no Canva, em /public/quemdesenha/icones). `QT` troca os emojis
// de um texto por eles; `QIcon` mostra um ícone pelo nome.
import { createIconText, type IconMap } from "@/components/ui/IconText";

export const QD_ICONS: IconMap = {
  "🧑‍🤝‍🧑": "grupo",
  "🎨": "paleta",
  "⭐": "estrela",
  "📖": "livro",
  "👑": "coroa",
  "🧑": "pessoa",
  "🎯": "alvo",
  "🏆": "trofeu",
  "🔥": "fogo",
  "🤖": "robo",
  "💡": "lampada",
  "✅": "certo",
  "📜": "pergaminho",
  "🏺": "vaso",
  "⚡": "raio",
  "➕": "mais",
  "🔒": "cadeado",
  "🌐": "globo",
  "🚪": "porta",
  "🙂": "sorriso",
  "⚙": "engrenagem",
  "🎲": "dado",
  "🥇": "ouro",
  "🥈": "prata",
  "🥉": "bronze",
  "🔁": "repetir",
  "✕": "x",
  "🌱": "broto",
  "🕊": "pomba",
  "🐑": "ovelha",
  "⛰": "montanha",
  "🟢": "verde",
  "🟡": "amarelo",
  "🔴": "vermelho",
  "✝": "cruz",
  "🤝": "aperto-de-mao",
  "🎵": "nota",
  "⛪": "igreja",
  "🧒": "crianca",
  "⏱": "cronometro",
  "▶": "play",
};

const qd = createIconText("/quemdesenha/icones", QD_ICONS);
/** Texto com os emojis trocados pelos ícones do Quem Desenha?. */
export const QT = qd.IconText;
/** Um ícone do Quem Desenha? pelo nome (arquivo em public/quemdesenha/icones). */
export const QIcon = qd.Icon;
