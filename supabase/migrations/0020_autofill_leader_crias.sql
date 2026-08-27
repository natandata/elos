-- ELOS — todo cria vira automaticamente responsabilidade do(s) líder(es)
-- aprovado(s) do mesmo Elo (mesmo gênero + faixa etária), nos dois sentidos:
--   1) cria novo entra num Elo que já tem líder → vincula na hora.
--   2) líder é aprovado/entra num Elo que já tem crias → vincula a todos eles.
-- O vínculo em si é feito por leader_crias, já usado em todo o app (Status
-- Crias, dashboard do líder, distribuição de missões etc.) — aqui só
-- automatizamos a criação dele, sem mudar RLS nem permissões.

create or replace function public.autofill_leader_crias_for_cria()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.role = 'cria' and new.elo_id is not null then
    insert into public.leader_crias (leader_id, cria_id)
    select p.id, new.id
      from public.profiles p
     where p.elo_id = new.elo_id
       and p.role = 'leader'
       and p.approved = true
    on conflict (leader_id, cria_id) do nothing;
  end if;
  return new;
end $fn$;

create or replace function public.autofill_leader_crias_for_leader()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.role = 'leader' and new.approved = true and new.elo_id is not null then
    insert into public.leader_crias (leader_id, cria_id)
    select new.id, p.id
      from public.profiles p
     where p.elo_id = new.elo_id
       and p.role = 'cria'
    on conflict (leader_id, cria_id) do nothing;
  end if;
  return new;
end $fn$;

-- depois do guard (que trava role/elo_id) e do autofill de elo (que resolve
-- new.elo_id) — os dois já rodam "before", então aqui new.elo_id já está certo
drop trigger if exists trg_c_autofill_leader_crias_cria on public.profiles;
create trigger trg_c_autofill_leader_crias_cria
  after insert or update on public.profiles
  for each row execute function public.autofill_leader_crias_for_cria();

drop trigger if exists trg_d_autofill_leader_crias_leader on public.profiles;
create trigger trg_d_autofill_leader_crias_leader
  after insert or update on public.profiles
  for each row execute function public.autofill_leader_crias_for_leader();

-- correção retroativa: vincula quem já deveria estar vinculado antes dessa migration
insert into public.leader_crias (leader_id, cria_id)
select l.id, c.id
  from public.profiles l
  join public.profiles c on c.elo_id = l.elo_id and c.role = 'cria'
 where l.role = 'leader' and l.approved = true and l.elo_id is not null
on conflict (leader_id, cria_id) do nothing;
