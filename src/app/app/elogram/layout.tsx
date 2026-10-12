import { redirect } from "next/navigation";
import { ThemeSetter } from "@/components/shell/ThemeSetter";
import { ElogramNav } from "@/components/elogram/ElogramNav";
import { homeFor, needsGuardianAck, needsStatusCheck, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** O Elogram ocupa a tela toda (sem o menu do ELOS), com a barra de baixo própria. */
export default async function ElogramLayout({ children }: { children: React.ReactNode }) {
  const { profile, viewingAs } = await requireProfile();

  // mesmas travas da área logada do ELOS
  if (
    profile.role !== "admin" &&
    profile.role !== "guardian" &&
    (!profile.gender || !profile.age_range)
  ) {
    redirect("/app/completar-perfil");
  }
  if (needsGuardianAck(profile)) redirect("/app/responsavel");
  const pending = profile.role === "leader" && !profile.approved;
  if (pending) redirect(homeFor(profile.role));
  if (!viewingAs && (await needsStatusCheck(profile))) redirect("/app/status");

  const supabase = await createClient();
  const canDm = profile.role === "admin" || profile.role === "leader" || profile.role === "cria";
  const { data: dmUnread } = canDm ? await supabase.rpc("dm_unread_count") : { data: 0 };

  let theme = "neutral";
  if (profile.role === "leader" && profile.gender === "male") theme = "leader";
  else if (profile.role !== "admin" && profile.gender) theme = profile.gender;

  return (
    <>
      <ThemeSetter theme={theme} />
      <div className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]">
        <div className="mx-auto w-full max-w-[470px] pb-28">{children}</div>
        <ElogramNav
          myId={profile.id}
          name={profile.full_name || "Você"}
          avatarUrl={profile.avatar_url}
          canDm={canDm}
          dmUnread={Number(dmUnread ?? 0)}
        />
      </div>
    </>
  );
}
