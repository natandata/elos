import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { CompleteProfileForm } from "./CompleteProfileForm";

export default async function CompleteProfilePage() {
  const { profile } = await requireProfile();
  if (profile.role === "admin" || (profile.gender && profile.age_range)) redirect("/app");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-black tracking-tight">Complete seu cadastro</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Precisamos disso para colocar você no Elo certo.
          </p>
        </div>
        <div className="card p-5">
          <CompleteProfileForm defaultName={profile.full_name} />
        </div>
      </div>
    </main>
  );
}
