import { redirect } from "next/navigation";
import { needsStatusCheck, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusForm } from "./StatusForm";

export default async function StatusPage() {
  const { profile, viewingAs } = await requireProfile();
  // Visualizar como nunca deve levar o admin a responder por outra pessoa.
  if (viewingAs || !(await needsStatusCheck(profile))) redirect("/app");

  const firstName = (profile.full_name || "").split(" ")[0];

  // Se o líder responder "Mal", a conversa é com a administração — o
  // "líder de todos os líderes" hoje. Busca os admins só nesse caso.
  let admins: { id: string; full_name: string }[] = [];
  if (profile.role === "leader") {
    const supabase = await createClient();
    // RPC (não select direto): a RLS de profiles não deixa um líder ler a
    // linha de um admin, já que não é "seu" líder nem está no mesmo Elo.
    const { data } = await supabase.rpc("leader_admin_contacts");
    admins = (data ?? []) as { id: string; full_name: string }[];
  }

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
          {profile.status_streak > 0 ? (
            <p className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              🔥 Sua ofensiva de {profile.status_streak}{" "}
              {profile.status_streak === 1 ? "dia está" : "dias está"} em jogo — responda pra continuar
            </p>
          ) : null}
        </div>
        <div className="card p-5">
          <StatusForm role={profile.role} admins={admins} />
        </div>
      </div>
    </main>
  );
}
