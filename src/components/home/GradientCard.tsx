import Link from "next/link";
import type { ReactNode } from "react";

// Linguagem visual da tela de Início: moldura em degradê, miolo no fundo do card, rótulo em caixa alta e blocos pastel.

export type GradientTone = "aurora" | "sunrise" | "gold" | "indigo" | "ocean" | "alarm";

const BORDER: Record<GradientTone, string> = {
  aurora: "linear-gradient(45deg, #f6d365, #fda085, #f5576c, #b24592, #4f5bd5)",
  sunrise: "linear-gradient(45deg, #f6d365, #fda085, #f5576c)",
  gold: "linear-gradient(45deg, #ffe27a, #f5b301, #fda085)",
  indigo: "linear-gradient(45deg, #4f5bd5, #b24592, #f5576c)",
  ocean: "linear-gradient(45deg, #4facfe, #7f53ac, #b24592)",
  alarm: "linear-gradient(45deg, #ff9068, #f5576c, #c9184a)",
};

/** Moldura em degradê. Sem `title`, vira uma faixa compacta (use `href` para torná-la um atalho). */
export function GradientCard({
  tone = "aurora",
  title,
  action,
  href,
  ariaLabel,
  className = "",
  dataTour,
  children,
}: {
  tone?: GradientTone;
  title?: string;
  action?: { href: string; label: string };
  href?: string;
  ariaLabel?: string;
  className?: string;
  dataTour?: string;
  children: ReactNode;
}) {
  const inner = (
    <div className={`rounded-[22px] bg-[var(--card)] ${title ? "px-4 py-4" : "px-4 py-3"}`}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">{title}</p>
          {action ? (
            <Link href={action.href} className="text-xs font-bold text-[var(--accent-strong)]">
              {action.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
  const cls = `mb-5 block overflow-hidden rounded-3xl p-[2px] ${className}`;
  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={`${cls} transition active:scale-[0.99]`} style={{ background: BORDER[tone] }}>
        {inner}
      </Link>
    );
  }
  return (
    <section aria-label={ariaLabel ?? title} data-tour={dataTour} className={cls} style={{ background: BORDER[tone] }}>
      {inner}
    </section>
  );
}

export const SOFT: Record<"yellow" | "peach" | "blue" | "green" | "pink" | "violet", string> = {
  yellow: "linear-gradient(135deg, #fff3b8, #ffd86b)",
  peach: "linear-gradient(135deg, #ffd9c7, #ffab91)",
  blue: "linear-gradient(135deg, #d6e4ff, #a9c1ff)",
  green: "linear-gradient(135deg, #d4f5e2, #8fe3b4)",
  pink: "linear-gradient(135deg, #ffd9ec, #ff9fcb)",
  violet: "linear-gradient(135deg, #e6dcff, #c3aaff)",
};

/** Bloco pastel com ícone marca-d'água, como os dos Destaques do ELOS. Texto sempre escuro (vale no tema claro e no escuro). */
export function SoftTile({
  tone,
  icon,
  label,
  className = "",
  children,
}: {
  tone: keyof typeof SOFT;
  icon: string;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-3.5 text-[#1d1535] ${className}`} style={{ background: SOFT[tone] }}>
      <span className="pointer-events-none absolute -right-2 -top-3 text-6xl opacity-20" aria-hidden>
        {icon}
      </span>
      {label ? <p className="text-[10px] font-black uppercase tracking-wider text-[#4a3f66]">{label}</p> : null}
      <div className={label ? "mt-1.5" : ""}>{children}</div>
    </div>
  );
}
