-- ELOS — destaques do Início: Elo nº 1 em pontuação, maior ofensiva de devocional e mais minutos de Bíblia.
-- Só nome curto (primeiro nome + inicial) e foto; contas de teste e admins ficam de fora.

create or replace function public.home_highlights()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_elo jsonb;
  v_dev jsonb;
  v_bible jsonb;
begin
  if auth.uid() is null then return null; end if;

  select jsonb_build_object('name', r.elo_name, 'points', r.total_xp)
    into v_elo
    from public.elo_rankings() r
   order by r.total_xp desc, r.elo_name
   limit 1;

  select jsonb_build_object(
           'name', split_part(p.full_name, ' ', 1) || coalesce(' ' || upper(left(nullif(split_part(p.full_name, ' ', 2), ''), 1)) || '.', ''),
           'avatar_url', p.avatar_url,
           'days', p.devotional_streak)
    into v_dev
    from public.profiles p
   where p.role in ('cria', 'leader')
     and coalesce(p.is_test_account, false) = false
     and p.devotional_streak > 0
     and p.devotional_streak_date >= v_today - 1
   order by p.devotional_streak desc, p.full_name
   limit 1;

  select jsonb_build_object(
           'name', split_part(x.full_name, ' ', 1) || coalesce(' ' || upper(left(nullif(split_part(x.full_name, ' ', 2), ''), 1)) || '.', ''),
           'avatar_url', x.avatar_url,
           'minutes', x.minutes)
    into v_bible
    from (
      select p.full_name, p.avatar_url, (sum(b.seconds) / 60)::int as minutes
        from public.bible_reading_daily b
        join public.profiles p on p.id = b.user_id
       where p.role in ('cria', 'leader')
         and coalesce(p.is_test_account, false) = false
       group by p.id, p.full_name, p.avatar_url
       having sum(b.seconds) >= 60
       order by sum(b.seconds) desc, p.full_name
       limit 1
    ) x;

  return jsonb_build_object('elo', v_elo, 'devotional', v_dev, 'bible', v_bible);
end $fn$;

revoke execute on function public.home_highlights() from public, anon;
grant execute on function public.home_highlights() to authenticated;
