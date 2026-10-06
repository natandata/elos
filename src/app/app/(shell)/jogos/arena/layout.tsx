import { ArenaMusic } from "@/components/arena/ArenaMusic";

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ArenaMusic />
    </>
  );
}
