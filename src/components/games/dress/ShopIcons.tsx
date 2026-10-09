// Ícones do Shopping Elos (public/shopping/icones): os da Arena dos Heróis que combinam e os criados para o shopping.
// `ST` troca os emojis de um texto por eles; `SIcon` mostra um ícone pelo nome.
import { createIconText, type IconMap } from "@/components/ui/IconText";

export const SHOP_ICONS: IconMap = {
  "🚪": "porta",
  "🎫": "bilhete",
  "🧭": "bussola",
  "🛍": "sacola",
  "🛗": "escada",
  "🍽": "talheres",
  "ℹ": "interrogacao",
  "🔥": "fogo",
  "🚧": "alerta",
  "👥": "dupla",
  "🪑": "cadeira",
  "🧍": "seta-cima",
  "👗": "vestido",
  "✔": "certo",
  "✅": "certo",
  "🎁": "presente",
  "⤒": "seta-cima",
  "💬": "balao",
  "🔊": "som",
  "🔇": "mudo",
  "⬆": "seta-cima",
  "⬇": "seta-baixo",
  "⭐": "estrela",
  "💜": "brilhos",
  "✨": "brilhos",
  "🏆": "trofeu",
  "🎵": "nota",
  "🪞": "brilhos",
  "🔒": "cadeado",
  "✕": "x",
  "←": "voltar",
};
const shop = createIconText("/shopping/icones", SHOP_ICONS);
export const ST = shop.IconText;
export const SIcon = shop.Icon;
