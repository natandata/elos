"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  // o selo de mensagens novas é atualizado sozinho (a barra não é recarregada ao trocar de aba)
  const [unread, setUnread] = useState(dmUnread);
  useEffect(() => {
    if (!canDm) return;
    const supabase = createClient();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      supabase.rpc("dm_unread_count").then(({ data }) => {
        if (typeof data === "number") setUnread(data);
      });
    };
    const timer = setInterval(refresh, 45_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [canDm]);
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
        <Link href="/app/elogram/mensagens" aria-label="Mensagens" prefetch className={pill(isDm)}>
          <PaperPlaneIcon filled={isDm} size={27} />
          {unread > 0 ? (
            <span
              aria-label="Mensagens novas"
              className="absolute right-[18px] top-[9px] h-3 w-3 rounded-full border-2 border-[var(--card)] bg-[#ff3040]"
            />
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
