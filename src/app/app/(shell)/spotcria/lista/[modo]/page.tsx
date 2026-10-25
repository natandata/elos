import { notFound } from "next/navigation";
import { ListPage } from "@/components/spotcria/Pages";

const MODES = {
  recent: { title: "Novas no ELOS", emoji: "🆕", gradient: "from-[#be185d] to-[#f472b6]", empty: "Ainda não há músicas." },
  played: { title: "Mais ouvidas", emoji: "🔥", gradient: "from-[#15803d] to-[#86efac]", empty: "Ninguém ouviu nada ainda." },
  liked_top: { title: "Mais curtidas", emoji: "💜", gradient: "from-[#3730a3] to-[#a5b4fc]", empty: "Ainda não há curtidas." },
  my_recent: { title: "Ouvidas por mim", emoji: "🕘", gradient: "from-[#be123c] to-[#fda4af]", empty: "Você ainda não ouviu nenhuma música." },
} as const;

export default async function Lista({ params }: { params: Promise<{ modo: string }> }) {
  const { modo } = await params;
  if (!(modo in MODES)) notFound();
  const cfg = MODES[modo as keyof typeof MODES];
  return (
    <ListPage
      mode={modo as keyof typeof MODES}
      title={cfg.title}
      cover={<span className={`grid aspect-square place-items-center rounded-lg bg-gradient-to-br ${cfg.gradient} text-6xl shadow-xl`}>{cfg.emoji}</span>}
      empty={cfg.empty}
    />
  );
}
