import { notFound } from "next/navigation";
import { ListPage } from "@/components/spotcria/Pages";
import { CoverArt } from "@/components/spotcria/ui";

const MODES = {
  recent: { title: "Novas no ELOS", empty: "Ainda não há músicas." },
  played: { title: "Mais ouvidas", empty: "Ninguém ouviu nada ainda." },
  liked_top: { title: "Mais curtidas", empty: "Ainda não há curtidas." },
  my_recent: { title: "Ouvidas por mim", empty: "Você ainda não ouviu nenhuma música." },
} as const;

export default async function Lista({ params }: { params: Promise<{ modo: string }> }) {
  const { modo } = await params;
  if (!(modo in MODES)) notFound();
  const cfg = MODES[modo as keyof typeof MODES];
  return (
    <ListPage
      mode={modo as keyof typeof MODES}
      title={cfg.title}
      cover={<CoverArt kind={modo} className="w-full shadow-xl" />}
      empty={cfg.empty}
    />
  );
}
