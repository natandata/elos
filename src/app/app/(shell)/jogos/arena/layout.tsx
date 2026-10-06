import { ArenaMusic } from "@/components/arena/ArenaMusic";
import { guardGame } from "@/lib/games/guard";

export default async function ArenaLayout({ children }: { children: React.ReactNode }) {
  await guardGame("arena");
  return (
    <>
      {children}
      <ArenaMusic />
    </>
  );
}
