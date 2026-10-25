import { SpotShell } from "@/components/spotcria/SpotShell";
import { spotHome } from "@/lib/actions/spotcria";
import { homeFor, requireProfile } from "@/lib/auth";

export const metadata = { title: "Spot Cria" };

export default async function SpotCriaLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, initialHome] = await Promise.all([requireProfile(), spotHome()]);
  return (
    <SpotShell meta={{ isAdmin: profile.role === "admin", name: profile.full_name || "", avatarUrl: profile.avatar_url ?? null, homeHref: homeFor(profile.role) }} initialHome={initialHome}>
      {children}
    </SpotShell>
  );
}
