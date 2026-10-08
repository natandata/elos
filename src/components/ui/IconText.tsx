// Troca emojis por ícones desenhados para o jogo, dentro de texto React. Sem estado e sem "use client":
// serve igual em componentes de servidor e de cliente. Emojis sem ícone ficam como estão.
import type { ReactNode } from "react";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// o seletor de emoji (U+FE0F) é opcional em qualquer emoji
const VS16 = /️/g;

export type IconMap = Record<string, string>;

export function createIconText(base: string, map: IconMap) {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${keys.map((k) => `${esc(k)}\\uFE0F?`).join("|")})`, "gu");

  function Icon({ name, size }: { name: string; size?: number | string }) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${base}/${name}.webp`}
        alt=""
        aria-hidden
        draggable={false}
        className="inline-block select-none align-[-0.22em]"
        style={{ width: size ?? "1.3em", height: size ?? "1.3em" }}
      />
    );
  }

  function walk(node: ReactNode, key = ""): ReactNode {
    if (typeof node === "string") {
      if (!re.test(node)) {
        re.lastIndex = 0;
        return node;
      }
      re.lastIndex = 0;
      return node.split(re).map((part, i) => {
        const name = map[part.replace(VS16, "")];
        return name ? <Icon key={`${key}${i}`} name={name} /> : part;
      });
    }
    if (Array.isArray(node)) return node.map((n, i) => walk(n, `${key}${i}-`));
    return node;
  }

  /** Texto (ou lista de textos e elementos) com os emojis trocados pelos ícones do jogo. */
  function IconText({ children }: { children?: ReactNode }) {
    return <>{walk(children)}</>;
  }

  return { IconText, Icon, has: (s: string) => ((re.lastIndex = 0), re.test(s)) };
}
