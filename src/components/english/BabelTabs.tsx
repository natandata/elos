"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IcoBag, IcoChest, IcoPath, IcoUser } from "./icons";

// Barra de abas do Babel (só nas telas principais; some dentro de lição e conversa).
const HOME = "/app/jogos/ingles";
const TABS = [
  { href: HOME, label: "Aprender", Icon: IcoPath },
  { href: `${HOME}/missoes`, label: "Missões", Icon: IcoChest },
  { href: `${HOME}/loja`, label: "Loja", Icon: IcoBag },
  { href: `${HOME}/perfil`, label: "Perfil", Icon: IcoUser },
];

export function BabelTabs() {
  const path = usePathname().replace(/\/$/, "");
  if (!TABS.some((t) => t.href === path)) return null;
  return (
    <nav className="bb-tabs" aria-label="Babel">
      {TABS.map(({ href, label, Icon }) => {
        const on = href === path;
        return (
          <Link key={href} href={href} className={`bb-tab ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
            <Icon className="h-7 w-7" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
