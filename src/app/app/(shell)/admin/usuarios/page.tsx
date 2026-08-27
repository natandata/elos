import { EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGE_RANGE_LABEL, type AgeRange, type Elo, type Gender, type Role } from "@/lib/types";
import { NewUserForm } from "./NewUserForm";
import { PendingLeaderCard } from "./PendingLeaderCard";
import { UserEditor } from "./UserEditor";
import { ExportUsersCsv } from "./ExportUsersCsv";

type Search = {
  q?: string;
  elo?: string;
  gender?: string;
  age?: string;
  role?: string;
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { profile: current } = await requireRole("admin");
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: elosData } = await supabase.from("elos").select("*").order("gender").order("age_range");
  const elos = (elosData ?? []) as Elo[];

  let query = supabase
    .from("profiles")
    .select("id, full_name, first_name, last_name, avatar_url, role, approved, gender, age_range, elo_id, xp")
    .order("full_name");

  if (sp.q) query = query.ilike("full_name", `%${sp.q}%`);
  if (sp.elo) query = query.eq("elo_id", sp.elo);
  if (sp.gender) query = query.eq("gender", sp.gender);
  if (sp.age) query = query.eq("age_range", sp.age);
  if (sp.role) query = query.eq("role", sp.role);

  const { data: usersData, error } = await query;
  const users = (usersData ?? []) as {
    id: string;
    full_name: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: Role;
    approved: boolean;
    gender: Gender | null;
    age_range: AgeRange | null;
    elo_id: string | null;
    xp: number;
  }[];

  const { data: emailRows } = await supabase.rpc("admin_user_emails");
  const emailById = new Map(
    ((emailRows ?? []) as { id: string; email: string }[]).map((r) => [r.id, r.email]),
  );

  const pendentes = users.filter((u) => u.role === "leader" && !u.approved);

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle={`${users.length} usuário(s) encontrados.`}
        action={
          <ExportUsersCsv
            users={users.map((u) => ({ ...u, email: emailById.get(u.id) ?? null }))}
            eloName={new Map(elos.map((e) => [e.id, e.name]))}
          />
        }
      />

      {pendentes.length > 0 ? (
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-700">
            Líderes aguardando aprovação ({pendentes.length})
          </h2>
          <div className="space-y-2">
            {pendentes.map((u) => (
              <PendingLeaderCard
                key={u.id}
                id={u.id}
                name={u.full_name}
                email={emailById.get(u.id) ?? null}
                avatarUrl={u.avatar_url}
              />
            ))}
          </div>
        </section>
      ) : null}

      <NewUserForm />

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="q">
            Buscar
          </label>
          <input id="q" name="q" className="input" defaultValue={sp.q ?? ""} placeholder="Nome" />
        </div>
        <div>
          <label className="label" htmlFor="elo">
            Elo
          </label>
          <select id="elo" name="elo" className="input" defaultValue={sp.elo ?? ""}>
            <option value="">Todos</option>
            {elos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="gender">
            Gênero
          </label>
          <select id="gender" name="gender" className="input" defaultValue={sp.gender ?? ""}>
            <option value="">Todos</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="age">
            Faixa etária
          </label>
          <select id="age" name="age" className="input" defaultValue={sp.age ?? ""}>
            <option value="">Todas</option>
            {(["12-14", "15-16", "17"] as AgeRange[]).map((a) => (
              <option key={a} value={a}>
                {AGE_RANGE_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <button className="btn btn-primary !py-2 !text-sm">Filtrar</button>
        </div>
      </form>

      {error ? (
        <EmptyState>Não foi possível carregar os usuários.</EmptyState>
      ) : users.length === 0 ? (
        <EmptyState>Nenhum usuário encontrado com esses filtros.</EmptyState>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <UserEditor
              key={u.id}
              user={{
                ...u,
                email: emailById.get(u.id) ?? null,
              }}
              elos={elos}
              isSelf={u.id === current.id}
            />
          ))}
        </div>
      )}
    </>
  );
}
