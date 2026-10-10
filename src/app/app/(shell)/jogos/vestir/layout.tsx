import { guardGame } from "@/lib/games/guard";
import { DressErrorWatch } from "@/components/games/dress/DressErrorWatch";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await guardGame("dress");
  return (
    <>
      <DressErrorWatch />
      {children}
    </>
  );
}
