import Link from "next/link";
import { splitMentions } from "@/lib/mentions";

/** Mostra um texto com as marcações como @Nome azul (leva ao perfil) e @todos em destaque. */
export function MentionText({
  text,
  className = "",
  tone = "default",
}: {
  text: string;
  className?: string;
  /** "onAccent": dentro de balão colorido (a cor azul some no fundo amarelo/rosa). */
  tone?: "default" | "onAccent";
}) {
  const parts = splitMentions(text);
  const mentionClass = tone === "onAccent" ? "font-bold underline" : "font-semibold text-[#4f8cff]";
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.text}</span>
        ) : p.type === "mention" ? (
          <Link key={i} href={`/app/elogram/perfil/${p.id}`} className={mentionClass}>
            @{p.name}
          </Link>
        ) : (
          <span key={i} className={mentionClass}>
            @todos
          </span>
        ),
      )}
    </span>
  );
}
