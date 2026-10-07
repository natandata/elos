"use server";

import { requireRole } from "@/lib/auth";
import { topFootballNews, type NewsItem } from "@/lib/arenasoccer/news";

/** As 3 notícias mais importantes da semana no mundo da bola (para o Mundo aberto). */
export async function getFootballNews(): Promise<NewsItem[]> {
  await requireRole("cria", "leader", "admin");
  return topFootballNews();
}
