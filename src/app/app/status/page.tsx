import { redirect } from "next/navigation";
import { needsStatusCheck, requireProfile } from "@/lib/auth";
import { StatusForm } from "./StatusForm";

export default async function StatusPage() {
  const { profile } = await requireProfile();
  if (!(await needsStatusCheck(profile))) redirect("/app");

  const firstName = (profile.full_name || "").split(" ")[0];

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-black tracking-tight">
            Como você está{firstName ? `, ${firstName}` : ""}?
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Uma resposta rápida por dia. Só sua liderança vê.
          </p>
        </div>
        <div className="card p-5">
          <StatusForm />
        </div>
      </div>
    </main>
  );
}
