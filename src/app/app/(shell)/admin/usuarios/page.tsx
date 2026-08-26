import { EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGE_RANGE_LABEL, type AgeRange, type Elo, type Role } from "@/lib/types";
import { UserEditor } from "./UserEditor";

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
  await requireRole("admin");
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: elosData } = await supabase.from("elos").select("*").order("gender").order("age_range");
  const elos = (elosData ?? []) as Elo[];

  let query = supabase
    .from("profiles")
    .select("id, full_name, role, gender, age_range, elo_id, xp")
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
    role: Role;
    gender: "male" | "female" | null;
    age_range: AgeRange | null;
    elo_id: string | null;
    xp: number;
  }[];

  const { data: links } = await supabase.from("leader_crias").select("leader_id, cria_id");
  const leaderByCria = new Map(
    ((links ?? []) as { leader_id: string; cria_id: string }[]).map((l) => [l.cria_id, l.leader_id]),
  );

  const leaders = users
    .filter((u) => u.role === "leader")
    .map((u) => ({ id: u.id, full_name: u.full_name }));

  return (
    <>
      <PageHeader title="Usuários" subtitle={`${users.length} usuário(s) encontrados.`} />

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
              user={{ ...u, leader_id: leaderByCria.get(u.id) ?? null }}
              elos={elos}
              leaders={leaders}
            />
          ))}
        </div>
      )}
    </>
  );
}
