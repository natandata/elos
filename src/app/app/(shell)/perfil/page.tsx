import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/lib/actions/session";
import { createClient } from "@/lib/supabase/server";
import {
  AGE_RANGE_LABEL,
  GENDER_LABEL,
  ROLE_LABEL,
  formatDateTime,
  formatXp,
} from "@/lib/types";
import { NameForm } from "./NameForm";
import { AvatarUploader } from "./AvatarUploader";

export default async function PerfilPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const [eloRes, txRes] = await Promise.all([
    profile.elo_id
      ? supabase.from("elos").select("name").eq("id", profile.elo_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("xp_transactions")
      .select("id, amount, created_at, missions:mission_id(title)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const eloName = (eloRes.data as { name: string } | null)?.name ?? "Sem Elo";
  const txs = (txRes.data ?? []) as unknown as {
    id: string;
    amount: number;
    created_at: string;
    missions: { title: string } | null;
  }[];

  return (
    <>
      <PageHeader title="Perfil" subtitle={`${ROLE_LABEL[profile.role]} · ${eloName}`} />

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-bold">Seus dados</h2>

          <div className="mb-4">
            <AvatarUploader
              userId={profile.id}
              name={profile.full_name}
              currentUrl={profile.avatar_url}
            />
          </div>

          <NameForm
            firstName={profile.first_name ?? ""}
            lastName={profile.last_name ?? ""}
          />

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-4 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted)]">Gênero</dt>
              <dd className="font-semibold">
                {profile.gender ? GENDER_LABEL[profile.gender] : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Faixa etária</dt>
              <dd className="font-semibold">
                {profile.age_range ? AGE_RANGE_LABEL[profile.age_range] : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Elo</dt>
              <dd className="font-semibold">{eloName}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">XP</dt>
              <dd className="font-semibold tabular-nums">{formatXp(profile.xp)}</dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-[var(--muted)]">
            Elo e XP são definidos pela administração e pelas missões aprovadas.
          </p>

          <form action={signOut} className="mt-4 border-t border-[var(--line)] pt-4">
            <button className="btn btn-ghost w-full !py-2 !text-sm">Sair</button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold">Histórico de XP</h2>
          {txs.length === 0 ? (
            <EmptyState>Nenhum XP recebido ainda.</EmptyState>
          ) : (
            <ul className="space-y-2 text-sm">
              {txs.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {t.missions?.title ?? "Missão"}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {formatDateTime(t.created_at)}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold text-emerald-600 tabular-nums">
                    +{t.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
