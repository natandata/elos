import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon, HeartIcon } from "@/components/feed/icons";
import { ElogramWordmark } from "./ElogramWordmark";

/** Topo da home do Elogram: voltar ao ELOS e "+" à esquerda, nome no centro, coração (atividade) à direita. */
export function ElogramTopBar({
  backHref,
  composer,
  unread,
}: {
  backHref: string | null;
  composer?: ReactNode;
  unread: number;
}) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pb-2 pt-3">
      <div className="flex items-center gap-1">
        {backHref ? (
          <Link href={backHref} aria-label="Voltar ao ELOS" className="-ml-1 rounded-lg p-1 text-[var(--muted)]">
            <ChevronLeftIcon size={26} />
          </Link>
        ) : null}
        {composer}
      </div>

      <ElogramWordmark />

      <div className="flex justify-end">
        <Link href="/app/elogram/notificacoes" aria-label="Atividade" className="relative rounded-lg p-1">
          <HeartIcon size={28} />
          {unread > 0 ? (
            <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg)] bg-[#ff3040]" />
          ) : null}
        </Link>
      </div>
    </header>
  );
}
