import Link from "next/link";
import { DressCountdown } from "@/components/games/dress/DressTeaser";
import { MineArenaClient } from "@/components/minearena/MineArenaClient";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { gameOpenFor, getReleaseDates } from "@/lib/games/releaseServer";

export default async function MineArenaPage() {
  const { profile } = await requireRole("cria", "leader", "admin");

  if (!(await gameOpenFor("minearena", profile.id))) {
    const dates = await getReleaseDates();
    const day = new Date(dates.minearena).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });
    return (
      <>
        <PageHeader title="⛏️ MineArena" subtitle="Construa. Explore. Enfrente." />
        <div className="relative mb-5 overflow-hidden rounded-2xl border-[3px] border-amber-400 bg-[#14213f] shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/minearena/capa.webp" alt="MineArena" className="block aspect-[3/2] w-full object-cover brightness-75" draggable={false} />
          <span className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden>
            🔒
          </span>
        </div>
        <section className="card mb-5 p-4 text-center">
          <p className="text-2xl font-black">Em breve!</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Um mundo de blocos em 3D para explorar, minerar, construir e enfrentar criaturas, com heróis da Bíblia ao seu lado. Abre dia {day}.
          </p>
          <div className="mt-4">
            <DressCountdown game="minearena" at={dates.minearena} />
          </div>
        </section>
        <Link href="/app/jogos" className="btn btn-ghost w-full">
          ← Voltar aos jogos
        </Link>
      </>
    );
  }

  return <MineArenaClient me={{ id: profile.id, name: (profile.full_name || "Jogador").split(" ")[0] }} free={profile.role === "admin"} />;
}
