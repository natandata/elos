import { SpotShell } from "@/components/spotcria/SpotShell";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Spot Cria" };

export default async function SpotCriaLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  return <SpotShell meta={{ isAdmin: profile.role === "admin", name: profile.full_name || "", avatarUrl: profile.avatar_url ?? null }}>{children}</SpotShell>;
}
