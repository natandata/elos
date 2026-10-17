-- ELOS — o XP do Tema do dia só pode ser ganho 1 vez por dia (fuso de São Paulo), por pessoa.
-- 1) award_feed_theme_xp passa a recusar um 2º XP do tema no mesmo dia (tema comum e tema em dupla).
-- 2) elogram_theme_today devolve também `my_awarded` (já ganhei o XP de hoje?), para a tela avisar.
-- 3) Correção retroativa: onde alguém ganhou mais de 1 XP do tema no mesmo dia, fica o primeiro e os outros são retirados.

drop function if exists public.elogram_theme_today();
create or replace function public.elogram_theme_today()
returns table (pair boolean, partner_id uuid, partner_name text, partner_avatar text, my_posted boolean, partner_posted boolean, my_awarded boolean)
language plpgsql security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_me uuid := auth.uid();
  v_partner uuid;
  v_awarded boolean;
begin
  v_awarded := v_me is not null and exists (
    select 1 from public.feed_posts f
     where f.author_id = v_me and f.theme_xp_awarded and not f.theme_xp_revoked
       and (f.created_at at time zone 'America/Sao_Paulo')::date = v_today);

  if v_me is null or (v_today - date '1970-01-01') % 2 <> 0 then
    return query select false, null::uuid, null::text, null::text, false, false, coalesce(v_awarded, false);
    return;
  end if;

  if not exists (select 1 from public.theme_pairs tp where tp.day = v_today) then
    perform pg_advisory_xact_lock(hashtext('theme_pairs:' || v_today::text));
    if not exists (select 1 from public.theme_pairs tp where tp.day = v_today) then
      insert into public.theme_pairs (day, user_id, partner_id)
      with el as (
        select p.id, p.elo_id, p.role, coalesce(p.is_test_account, false) as t,
               row_number() over (partition by p.elo_id, p.role, coalesce(p.is_test_account, false)
                                  order by md5(v_today::text || p.id::text)) as rn,
               count(*) over (partition by p.elo_id, p.role, coalesce(p.is_test_account, false)) as n
          from public.profiles p
         where p.role in ('cria', 'leader') and p.approved and p.elo_id is not null
      )
      select v_today, a.id, b.id
        from el a
        join el b on b.elo_id = a.elo_id and b.role = a.role and b.t = a.t
         and b.rn = case when a.rn % 2 = 0 then a.rn - 1 when a.rn < a.n then a.rn + 1 else 1 end
       where a.n >= 2
      on conflict do nothing;
    end if;
  end if;

  select tp.partner_id into v_partner from public.theme_pairs tp where tp.day = v_today and tp.user_id = v_me;
  if v_partner is null then
    return query select false, null::uuid, null::text, null::text, false, false, v_awarded;
    return;
  end if;

  return query
  select true, v_partner,
         coalesce(nullif(pr.username, ''), pr.full_name), pr.avatar_url,
         exists (select 1 from public.feed_posts f where f.author_id = v_me and f.theme_confirmed
                   and (f.created_at at time zone 'America/Sao_Paulo')::date = v_today),
         exists (select 1 from public.feed_posts f where f.author_id = v_partner and f.theme_confirmed
                   and (f.created_at at time zone 'America/Sao_Paulo')::date = v_today),
         v_awarded
    from public.profiles pr where pr.id = v_partner;
end $fn$;
revoke execute on function public.elogram_theme_today() from anon, public;
grant execute on function public.elogram_theme_today() to authenticated;

create or replace function public.award_feed_theme_xp(p_post_id uuid)
returns text language plpgsql security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_author uuid; v_confirmed boolean; v_awarded boolean; v_created timestamptz;
  v_partner uuid; v_pposted boolean;
  r record; v_up uuid; v_pp uuid; v_name text; v_status text := 'none';
begin
  select author_id, theme_confirmed, theme_xp_awarded, created_at
    into v_author, v_confirmed, v_awarded, v_created
    from public.feed_posts where id = p_post_id;

  if v_author is null or v_author <> auth.uid() then
    raise exception 'Sem permissão';
  end if;
  if not coalesce(v_confirmed, false) or coalesce(v_awarded, false) then
    return 'none';
  end if;
  -- o XP do tema vale 1 vez por dia: se já ganhou hoje, este post não rende XP
  if exists (select 1 from public.feed_posts f
              where f.author_id = v_author and f.id <> p_post_id and f.theme_xp_awarded and not f.theme_xp_revoked
                and (f.created_at at time zone 'America/Sao_Paulo')::date = v_today) then
    return 'none';
  end if;

  select tp.partner_id into v_partner from public.theme_pairs tp
   where tp.day = v_today and tp.user_id = v_author
     and (v_today - date '1970-01-01') % 2 = 0
     and (v_created at time zone 'America/Sao_Paulo')::date = v_today;

  if v_partner is null then
    perform set_config('elos.xp_bypass', 'on', true);
    update public.profiles set xp = xp + 1 where id = v_author;
    update public.feed_posts set theme_xp_awarded = true where id = p_post_id;
    perform set_config('elos.xp_bypass', 'off', true);
    insert into public.xp_transactions (user_id, feed_post_id, amount, type) values (v_author, p_post_id, 1, 'feed_theme');
    return 'awarded';
  end if;

  select coalesce(nullif(username, ''), full_name) into v_name from public.profiles where id = v_author;

  for r in
    select tp.user_id, tp.partner_id from public.theme_pairs tp
     where tp.day = v_today and (tp.user_id = v_author or tp.partner_id = v_author)
  loop
    v_up := null; v_pp := null;
    -- quem já ganhou o XP do tema hoje não ganha de novo
    if exists (select 1 from public.feed_posts f
                where f.author_id = r.user_id and f.theme_xp_awarded and not f.theme_xp_revoked
                  and (f.created_at at time zone 'America/Sao_Paulo')::date = v_today) then
      continue;
    end if;
    select f.id into v_up from public.feed_posts f
     where f.author_id = r.user_id and f.theme_confirmed and not f.theme_xp_awarded and not f.theme_xp_revoked
       and (f.created_at at time zone 'America/Sao_Paulo')::date = v_today
     order by f.created_at limit 1;
    if v_up is null then continue; end if;
    select f.id into v_pp from public.feed_posts f
     where f.author_id = r.partner_id and f.theme_confirmed and not f.theme_xp_revoked
       and (f.created_at at time zone 'America/Sao_Paulo')::date = v_today
     limit 1;
    if v_pp is null then continue; end if;

    perform set_config('elos.xp_bypass', 'on', true);
    update public.profiles set xp = xp + 1 where id = r.user_id;
    update public.feed_posts set theme_xp_awarded = true where id = v_up;
    perform set_config('elos.xp_bypass', 'off', true);
    insert into public.xp_transactions (user_id, feed_post_id, amount, type) values (r.user_id, v_up, 1, 'feed_theme');
    if r.user_id = v_author then
      v_status := 'awarded';
    else
      insert into public.notifications (user_id, title, body, link, category)
      values (r.user_id, 'Dupla completa! 🎉', coalesce(v_name, 'Sua dupla') || ' postou o tema do dia e vocês dois ganharam +1 XP.', '/app/elogram', 'feed');
    end if;
  end loop;

  if v_status = 'none' then
    v_status := 'waiting';
    select exists (select 1 from public.feed_posts f where f.author_id = v_partner and f.theme_confirmed
                     and (f.created_at at time zone 'America/Sao_Paulo')::date = v_today) into v_pposted;
    if not v_pposted then
      insert into public.notifications (user_id, title, body, link, category)
      values (v_partner, 'Sua dupla já postou o tema do dia! 👯',
              coalesce(v_name, 'Sua dupla') || ' postou e está esperando você. Poste o seu para vocês dois ganharem +1 XP.', '/app/elogram', 'feed');
    end if;
  end if;
  return v_status;
end $fn$;
revoke execute on function public.award_feed_theme_xp(uuid) from anon, public;
grant execute on function public.award_feed_theme_xp(uuid) to authenticated;

-- ---------------------------------------------------------------- correção retroativa
do $fix$
declare r record;
begin
  create temp table _theme_extras on commit drop as
    select x.id, x.author_id from (
      select p.id, p.author_id,
             row_number() over (partition by p.author_id, (p.created_at at time zone 'America/Sao_Paulo')::date order by p.created_at, p.id) rn
        from public.feed_posts p
       where p.theme_xp_awarded and not p.theme_xp_revoked) x
     where x.rn > 1;

  perform set_config('elos.xp_bypass', 'on', true);
  update public.feed_posts set theme_xp_revoked = true, theme_xp_revoked_at = now()
   where id in (select id from _theme_extras);
  for r in select author_id, count(*) n from _theme_extras group by author_id loop
    update public.profiles set xp = greatest(0, xp - r.n) where id = r.author_id;
    insert into public.notifications (user_id, title, body, link, category)
    values (r.author_id, 'XP do tema ajustado',
            'O XP do Tema do dia só vale 1 vez por dia. Retiramos ' || r.n || ' XP de posts extras do mesmo dia. Continue postando: cada dia você ganha 1 XP!', '/app/elogram', 'feed');
  end loop;
  perform set_config('elos.xp_bypass', 'off', true);
  insert into public.xp_transactions (user_id, feed_post_id, amount, type)
    select author_id, id, -1, 'feed_theme_revoked' from _theme_extras;
end $fix$;
