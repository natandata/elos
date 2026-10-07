/** Item da Loja da Sala de Jogos (client-safe). */
export type StoreItem = {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  cover: string | null;
  href: string | null;
  /** jogo do catálogo que esta compra libera */
  game_key: string | null;
  status: "scheduled" | "dev";
  release_at: string | null;
  price_coins: number | null;
  active: boolean;
  sort: number;
};

export const STORE_COLUMNS = "id, title, emoji, blurb, cover, href, game_key, status, release_at, price_coins, active, sort";
