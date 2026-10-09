-- Vista o Herói: loja de peças raras (bilhetes dourados), rankings da semana e do Mega, troféus/títulos.

-- ------------------------------------------------------------------ resultado marca se foi no Mega
alter table public.dress_room_results add column if not exists mega boolean not null default false;

do $mig$
declare d text;
begin
  d := pg_get_functiondef('public._dress_room_settle'::regproc);
  if position('insert into public.dress_room_results (room_id, round, user_id, theme_id, place, score, votes, stars_sum, fives, tickets, created_at)' in d) = 0 then
    raise exception 'settle: insert nao encontrado';
  end if;
  d := replace(d, 'insert into public.dress_room_results (room_id, round, user_id, theme_id, place, score, votes, stars_sum, fives, tickets, created_at)',
                  'insert into public.dress_room_results (room_id, round, user_id, theme_id, place, score, votes, stars_sum, fives, tickets, created_at, mega)');
  d := replace(d, E'           p_now\n      from ranked k', E'           p_now, v_mega\n      from ranked k');
  if position('p_now, v_mega' in d) = 0 then raise exception 'settle: select nao encontrado'; end if;
  execute d;
end $mig$;

-- ------------------------------------------------------------------ loja: peças épicas e lendárias
create table if not exists public.dress_inventory (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  family    text not null,
  price     integer not null,
  bought_at timestamptz not null default now(),
  primary key (user_id, family)
);
alter table public.dress_inventory enable row level security;
drop policy if exists dress_inventory_read on public.dress_inventory;
create policy dress_inventory_read on public.dress_inventory for select to authenticated using (user_id = auth.uid());

-- a mesma lista de src/lib/games/dress/rarity.ts
create or replace function public._dress_family_price(p_family text)
returns integer language sql immutable as $fn$
  select case
    when p_family = any (array['crown','diadem','tiara','royal','jeweled','scepter','embroidered','gown','mermaid','wings','stars','halo','chandelier','medallion','fascinator']) then 150
    when p_family = any (array['helmet','armor','necklace','cape','caped','metal','laurel','flowers','harp','trumpet','alabaster','lamp','sword',
                               'toga','kaftan','jumpsuit','bolero','poncho','sunhat','feather','pearlband','parasol','fan','mirror','pearls','layered','cuff','watch','wedge','kitten','earstars','drops']) then 60
    else 0 end
$fn$;

create or replace function public.dress_buy_family(p_family text)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_price integer := public._dress_family_price(p_family); v_have integer; v_new integer;
begin
  if v_price <= 0 then return jsonb_build_object('error', 'Essa peça é de graça.'); end if;
  if exists (select 1 from public.dress_inventory where user_id = v_uid and family = p_family) then
    return jsonb_build_object('error', 'Você já tem essa peça.');
  end if;
  select tickets into v_have from public.dress_stats where user_id = v_uid for update;
  if coalesce(v_have, 0) < v_price then
    return jsonb_build_object('error', 'Faltam ' || (v_price - coalesce(v_have, 0)) || ' bilhetes dourados.');
  end if;
  v_new := public.dress_apply_result(v_uid, -v_price, false);
  insert into public.dress_inventory (user_id, family, price) values (v_uid, p_family, v_price);
  return jsonb_build_object('ok', true, 'tickets', v_new, 'family', p_family);
end $fn$;

create or replace function public.dress_my_inventory()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid();
begin
  return jsonb_build_object(
    'families', coalesce((select jsonb_agg(family) from public.dress_inventory where user_id = v_uid), '[]'::jsonb),
    'tickets', coalesce((select tickets from public.dress_stats where user_id = v_uid), 0));
end $fn$;

-- ------------------------------------------------------------------ rankings: semana (segunda a domingo, Brasília) e Mega
-- p_kind: 'week' | 'mega' ; pontos = 5 por 1º, 3 por 2º, 2 por 3º, 1 por jogar
create or replace function public.dress_rank_period(p_kind text)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_from timestamptz; v_uid uuid := public._dress_uid();
begin
  v_from := (date_trunc('week', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.pts desc, t.wins desc, t.games asc) from (
      select r.user_id as id, coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'Jogadora') as name,
             count(*)::int as games, count(*) filter (where r.place = 1)::int as wins, count(*) filter (where r.place <= 3)::int as podiums,
             (count(*) filter (where r.place = 1) * 5 + count(*) filter (where r.place = 2) * 3 + count(*) filter (where r.place = 3) * 2 + count(*))::int as pts,
             (r.user_id = v_uid) as me
        from public.dress_room_results r join public.profiles p on p.id = r.user_id
       where ((p_kind = 'mega' and r.mega) or (p_kind <> 'mega' and r.created_at >= v_from))
         and coalesce(p.is_test_account, false) = false
       group by r.user_id, p.full_name
       order by pts desc, wins desc, games asc
       limit 20
    ) t), '[]'::jsonb);
end $fn$;

-- ------------------------------------------------------------------ troféus e títulos: contagens para a tela decidir o que está conquistado
create table if not exists public.dress_profile_pref (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  title   text,
  updated_at timestamptz not null default now()
);
alter table public.dress_profile_pref enable row level security;
drop policy if exists dress_pref_read on public.dress_profile_pref;
create policy dress_pref_read on public.dress_profile_pref for select to authenticated using (true);

create or replace function public.dress_achievements(p_user uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := coalesce(p_user, public._dress_uid());
begin
  return jsonb_build_object(
    'games',     (select count(*) from public.dress_room_results where user_id = v_uid),
    'wins',      (select count(*) from public.dress_room_results where user_id = v_uid and place = 1),
    'podiums',   (select count(*) from public.dress_room_results where user_id = v_uid and place <= 3),
    'mega',      (select count(*) from public.dress_room_results where user_id = v_uid and mega),
    'mega_wins', (select count(*) from public.dress_room_results where user_id = v_uid and mega and place = 1),
    'fives',     (select coalesce(sum(fives), 0) from public.dress_room_results where user_id = v_uid),
    'rare',      (select count(*) from public.dress_inventory where user_id = v_uid),
    'tickets',   coalesce((select tickets from public.dress_stats where user_id = v_uid), 0),
    'title',     (select title from public.dress_profile_pref where user_id = v_uid));
end $fn$;

create or replace function public.dress_set_title(p_title text)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid();
begin
  insert into public.dress_profile_pref (user_id, title) values (v_uid, left(nullif(trim(p_title), ''), 40))
  on conflict (user_id) do update set title = excluded.title, updated_at = now();
  return jsonb_build_object('ok', true);
end $fn$;

revoke all on function public.dress_buy_family(text), public.dress_my_inventory(), public.dress_rank_period(text),
  public.dress_achievements(uuid), public.dress_set_title(text) from public, anon;
grant execute on function public.dress_buy_family(text), public.dress_my_inventory(), public.dress_rank_period(text),
  public.dress_achievements(uuid), public.dress_set_title(text) to authenticated;
