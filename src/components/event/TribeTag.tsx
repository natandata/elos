"use client";

import { TRIBES } from "@/lib/event/tribes";
import { useTribeOf } from "./EventProvider";

/** Etiqueta da tribo ao lado do nome: brasão + nome, discreta. Não aparece fora do evento nem para quem não tem tribo. */
export function TribeTag({ userId, size = "sm", className = "" }: { userId?: string | null; size?: "xs" | "sm"; className?: string }) {
  const key = useTribeOf(userId);
  if (!key) return null;
  const t = TRIBES[key];
  const img = size === "xs" ? 14 : 16;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full align-middle font-bold leading-none ${size === "xs" ? "py-0.5 pl-0.5 pr-1.5 text-[10px]" : "py-0.5 pl-0.5 pr-2 text-[11px]"} ${className}`}
      style={{ background: t.soft, color: t.dark, boxShadow: `inset 0 0 0 1px ${t.base}` }}
      title={`Tribo ${t.name}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={t.img} alt="" width={img} height={img} className="shrink-0" />
      {t.name}
    </span>
  );
}
