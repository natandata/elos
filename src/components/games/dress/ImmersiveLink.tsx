"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { enterImmersive } from "@/lib/games/dress/immersive";

/** Link que, no celular, já põe o jogo em tela cheia e deitado (precisa do toque da jogadora). */
export function ImmersiveLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={className} onClick={() => enterImmersive()}>
      {children}
    </Link>
  );
}
