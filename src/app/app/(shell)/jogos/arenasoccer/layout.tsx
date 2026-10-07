import { guardGame } from "@/lib/games/guard";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await guardGame("arenasoccer");
  return children;
}
