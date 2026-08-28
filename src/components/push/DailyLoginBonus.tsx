"use client";

import { useEffect } from "react";
import { claimDailyLoginBonus } from "@/lib/actions/engagement";

const KEY = "elos-login-bonus-checked-on";

/** Reivindica o bônus de +1 XP do primeiro acesso do dia — no máximo uma
 * tentativa por dia por navegador (o servidor também é idempotente). */
export function DailyLoginBonus() {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(KEY) === today) return;
    localStorage.setItem(KEY, today);
    claimDailyLoginBonus().catch(() => {});
  }, []);

  return null;
}
