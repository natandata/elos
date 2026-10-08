import Link from "next/link";
import { ArenaMusic } from "@/components/arena/ArenaMusic";
import { PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { arenaAsleep } from "@/lib/games/curfew";
import { guardGame } from "@/lib/games/guard";
import { AT } from "@/components/arena/ArenaText";

export default async function ArenaLayout({ children }: { children: React.ReactNode }) {
  await guardGame("arena");
  const { profile } = await requireProfile();
  if (arenaAsleep() && profile.role !== "admin") {
    return (
      <>
        <PageHeader title={<AT>🌙 Arena dos Heróis</AT>} subtitle="Os heróis estão descansando." />
        <section className="card mb-5 p-5 text-center">
          <p className="text-4xl" aria-hidden><AT>
            😴
          </AT></p>
          <p className="mt-2 text-lg font-black">A Arena abre às 06h00</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Das 00h às 06h a Arena fica fechada para você descansar. Volte de manhã!</p>
        </section>
        <Link href="/app/jogos" className="btn btn-ghost w-full"><AT>
          ← Voltar aos jogos
        </AT></Link>
      </>
    );
  }
  return (
    <>
      {children}
      <ArenaMusic />
    </>
  );
}
