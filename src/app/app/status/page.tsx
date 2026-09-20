import { redirect } from "next/navigation";
import { needsStatusCheck, requireProfile } from "@/lib/auth";
import { ViewAsBanner } from "@/components/shell/ViewAsBanner";
import { StatusForm } from "./StatusForm";

export default async function StatusPage() {
  const { profile, viewingAs } = await requireProfile();
  if (!(await needsStatusCheck(profile))) redirect("/app");

  const firstName = (profile.full_name || "").split(" ")[0];

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      {viewingAs ? <ViewAsBanner targetName={viewingAs.targetName} /> : null}
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-black tracking-tight">
            Como você está{firstName ? `, ${firstName}` : ""}?
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Uma resposta rápida por dia. Só sua liderança vê.
          </p>
          {profile.status_streak > 0 ? (
            <p className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              🔥 Sua ofensiva de {profile.status_streak}{" "}
              {profile.status_streak === 1 ? "dia está" : "dias está"} em jogo — responda pra continuar
            </p>
          ) : null}
        </div>
        <div className="card p-5">
          <StatusForm />
        </div>
      </div>
    </main>
  );
}
