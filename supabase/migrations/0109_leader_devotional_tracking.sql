-- ELOS — líder acompanha o devocional dos próprios crias: ofensiva/atividade
-- (sem o texto do diário, que é pessoal) + conteúdo dos pedidos de oração
-- (pessoais ou compartilhados com o Elo) — escopo decidido com o Natan:
-- "participação + pedidos de oração", não o diário completo.

-- Pedidos de oração dos crias que o líder lidera — hoje só dava pra ver o
-- que já era compartilhado com o Elo (scope='elo'); agora também os
-- pessoais, pra o líder saber pelo que orar mesmo sem o cria ter marcado
-- "compartilhar com o Elo".
drop policy if exists prayer_requests_read on public.prayer_requests;
create policy prayer_requests_read on public.prayer_requests for select to authenticated using (
  user_id = auth.uid()
  or (scope = 'elo' and elo_id is not null and elo_id = (select elo_id from public.profiles where id = auth.uid()))
  or public.is_admin()
  or public.is_leader_of(user_id)
);

-- Ofensiva/atividade do diário dos crias do líder — nunca o texto (content),
-- só contagem e data da última anotação. SECURITY DEFINER em vez de RLS
-- direta em devotional_entries: assim o conteúdo nunca fica ao alcance de
-- uma query do líder por engano, só o que essa função explicitamente expõe.
create or replace function public.leader_devotional_progress()
returns table (
  cria_id uuid,
  full_name text,
  devotional_streak int,
  devotional_streak_date date,
  diary_count bigint,
  last_diary_date date,
  favorites_count bigint
)
language sql stable security definer set search_path = public as $fn$
  select
    p.id as cria_id,
    p.full_name,
    p.devotional_streak,
    p.devotional_streak_date,
    coalesce(de.cnt, 0) as diary_count,
    de.last_date as last_diary_date,
    coalesce(fv.cnt, 0) as favorites_count
  from public.leader_crias lc
  join public.profiles p on p.id = lc.cria_id
  left join (
    select user_id, count(*) as cnt, max(entry_date) as last_date
      from public.devotional_entries group by user_id
  ) de on de.user_id = p.id
  left join (
    select user_id, count(*) as cnt
      from public.devotional_favorites group by user_id
  ) fv on fv.user_id = p.id
  where lc.leader_id = auth.uid()
  order by p.full_name
$fn$;

revoke execute on function public.leader_devotional_progress() from anon, public;
grant  execute on function public.leader_devotional_progress() to authenticated;
