"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { HomeIcon, PaperPlaneIcon, SearchIcon } from "@/components/feed/icons";

/** Barra de baixo flutuante do Elogram — mesmo desenho do Instagram (sem a aba de Reels). */
export function ElogramNav({
  myId,
  name,
  avatarUrl,
  canDm,
  dmUnread,
}: {
  myId: string;
  name: string;
  avatarUrl: string | null;
  canDm: boolean;
  dmUnread: number;
}) {
  const path = usePathname();
  // dentro de uma conversa a barra some (como no Instagram): o campo de mensagem ocupa o rodapé
  if (path.startsWith("/app/elogram/mensagens/")) return null;
  const isHome = path === "/app/elogram";
  const isDm = path.startsWith("/app/elogram/mensagens");
  const isSearch = path.startsWith("/app/elogram/buscar");
  const isMe = path === `/app/elogram/perfil/${myId}`;

  const pill = (active: boolean) =>
    `relative flex h-12 min-w-[64px] flex-1 items-center justify-center rounded-full transition ${
      active ? "bg-[var(--line)]" : ""
    }`;

  return (
    <nav
      aria-label="Elogram"
      className="fixed inset-x-0 z-40 mx-auto flex w-[calc(100%-24px)] max-w-[446px] items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--card)]/92 p-1.5 shadow-lg backdrop-blur"
      style={{ bottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <Link href="/app/elogram" aria-label="Início" prefetch className={pill(isHome)}>
        <HomeIcon filled={isHome} size={27} />
      </Link>

      {canDm ? (
        <Link href="/app/elogram/mensagens" aria-label="Mensagens" className={pill(isDm)}>
          <PaperPlaneIcon filled={isDm} size={27} />
          {dmUnread > 0 ? (
            <span className="absolute right-3 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3040] px-1 text-[11px] font-bold leading-none text-white">
              {dmUnread > 9 ? "9+" : dmUnread}
            </span>
          ) : null}
        </Link>
      ) : null}

      <Link href="/app/elogram/buscar" aria-label="Buscar" prefetch className={pill(isSearch)}>
        <SearchIcon size={27} />
      </Link>

      <Link href={`/app/elogram/perfil/${myId}`} aria-label="Meu perfil" prefetch className={pill(isMe)}>
        <span className={`rounded-full ${isMe ? "ring-2 ring-[var(--ink)]" : ""}`}>
          <Avatar url={avatarUrl} name={name} size={30} />
        </span>
      </Link>
    </nav>
  );
}
