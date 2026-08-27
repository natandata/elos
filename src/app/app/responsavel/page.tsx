import { redirect } from "next/navigation";
import { needsGuardianAck, requireProfile } from "@/lib/auth";
import { GuardianAckForm } from "./GuardianAckForm";

export default async function ResponsavelPage() {
  const { profile } = await requireProfile();
  if (!needsGuardianAck(profile)) redirect("/app");

  const firstName = (profile.full_name || "").split(" ")[0];

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-black tracking-tight">
            Confirmação do responsável{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            A cada 15 dias pedimos essa confirmação de novo, por segurança.
          </p>
        </div>
        <div className="card p-5">
          <GuardianAckForm />
        </div>
      </div>
    </main>
  );
}
