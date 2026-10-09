-- Shopping Elos (Vista o Herói): ofertas raras (3 unidades por 24 h), praça de alimentação, doação de bilhetes dourados.
-- O jogo fica oculto (só admin / acesso antecipado); aqui só a conta é feita no banco.

-- ------------------------------------------------------------------ tabelas
create table if not exists public.mall_rare_drops (
  id        bigserial primary key,
  day       date not null,
  family    text not null,
  price     integer not null,
  stock     integer not null default 3,
  sold      integer not null default 0,
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  unique (day, family)
);
create table if not exists public.mall_rare_buys (
  drop_id bigint not null references public.mall_rare_drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  at      timestamptz not null default now(),
  primary key (drop_id, user_id)
);
create table if not exists public.mall_gifts (
  id         bigserial primary key,
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  amount     integer not null check (amount between 1 and 30),
  created_at timestamptz not null default now(),
  seen       boolean not null default false
);
create index if not exists mall_gifts_from_idx on public.mall_gifts (from_user, created_at desc);
create index if not exists mall_gifts_to_idx on public.mall_gifts (to_user, created_at desc);
create table if not exists public.mall_foods (
  key     text primary key,
  place   text not null,
  name    text not null,
  emoji   text not null,
  price   integer not null check (price > 0),
  seconds integer not null default 6
);
create table if not exists public.mall_meals (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  food       text not null references public.mall_foods(key),
  price      integer not null,
  created_at timestamptz not null default now()
);
create index if not exists mall_meals_user_idx on public.mall_meals (user_id, created_at desc);

alter table public.mall_rare_drops enable row level security;
alter table public.mall_rare_buys enable row level security;
alter table public.mall_gifts enable row level security;
alter table public.mall_foods enable row level security;
alter table public.mall_meals enable row level security;
drop policy if exists mall_drops_read on public.mall_rare_drops;
create policy mall_drops_read on public.mall_rare_drops for select to authenticated using (true);
drop policy if exists mall_buys_read on public.mall_rare_buys;
create policy mall_buys_read on public.mall_rare_buys for select to authenticated using (user_id = auth.uid());
drop policy if exists mall_gifts_read on public.mall_gifts;
create policy mall_gifts_read on public.mall_gifts for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());
drop policy if exists mall_foods_read on public.mall_foods;
create policy mall_foods_read on public.mall_foods for select to authenticated using (true);
drop policy if exists mall_meals_read on public.mall_meals;
create policy mall_meals_read on public.mall_meals for select to authenticated using (user_id = auth.uid());

insert into public.mall_foods (key, place, name, emoji, price, seconds) values
  ('pao_manteiga',   'padaria',    'Pão com manteiga',       '🥖',  3, 5),
  ('pao_queijo',     'padaria',    'Pão de queijo',          '🧀',  4, 5),
  ('bolo_milho',     'padaria',    'Bolo de milho',          '🍰',  6, 6),
  ('suco_laranja',   'padaria',    'Suco de laranja',        '🧃',  4, 5),
  ('pizza_fatia',    'pizzaria',   'Fatia de pizza',         '🍕', 10, 6),
  ('calzone',        'pizzaria',   'Calzone',                '🥟', 14, 7),
  ('pizza_inteira',  'pizzaria',   'Pizza inteira',          '🍕', 30, 9),
  ('refri',          'pizzaria',   'Refrigerante',           '🥤',  5, 5),
  ('espetinho',      'churrasco',  'Espetinho',              '🍢',  8, 6),
  ('farofa',         'churrasco',  'Arroz, feijão e farofa', '🍛', 12, 7),
  ('picanha',        'churrasco',  'Prato de picanha',       '🥩', 35, 9),
  ('guarana',        'churrasco',  'Guaraná',                '🥤',  4, 5),
  ('sorvete',        'sorveteria', 'Casquinha de sorvete',   '🍦',  6, 6),
  ('milkshake',      'sorveteria', 'Milkshake',              '🥛', 10, 6),
  ('acai',           'sorveteria', 'Açaí na tigela',         '🍇', 12, 7),
  ('picole',         'sorveteria', 'Picolé',                 '🍧',  5, 5),
  ('cafe',           'cafeteria',  'Café',                   '☕',  3, 5),
  ('cappuccino',     'cafeteria',  'Cappuccino',             '☕',  6, 6),
  ('torta',          'cafeteria',  'Fatia de torta',         '🥧',  9, 6),
  ('crepe',          'cafeteria',  'Crepe doce',             '🥞', 12, 7)
on conflict (key) do nothing;

-- ------------------------------------------------------------------ ofertas do dia (3 peças, 3 unidades cada, 24 h; vira à meia-noite de Brasília)
create or replace function public._mall_pool()
returns jsonb language sql immutable as $fn$
  select '[["madcrown",450],["aurora",380],["galadress",450],["starmaid",420],["starcape",360],["crystal",320],["starwand",340],["comet",300],["constel",330],["auroracuff",300]]'::jsonb
$fn$;

create or replace function public._mall_ensure_today()
returns date language plpgsql security definer set search_path to 'public' as $fn$
declare v_day date := (now() at time zone 'America/Sao_Paulo')::date; v_pool jsonb := public._mall_pool(); v_base integer; i integer; v_entry jsonb; v_start timestamptz;
begin
  if exists (select 1 from public.mall_rare_drops where day = v_day) then return v_day; end if;
  v_base := (v_day - date '2026-01-01') * 3;
  v_start := (v_day::timestamp) at time zone 'America/Sao_Paulo';
  for i in 0..2 loop
    v_entry := v_pool -> ((v_base + i) % jsonb_array_length(v_pool));
    insert into public.mall_rare_drops (day, family, price, stock, starts_at, ends_at)
    values (v_day, v_entry->>0, (v_entry->>1)::int, 3, v_start, v_start + interval '24 hours')
    on conflict (day, family) do nothing;
  end loop;
  return v_day;
end $fn$;

create or replace function public.mall_rare_offers()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_day date := public._mall_ensure_today();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'family', d.family, 'price', d.price, 'stock', d.stock, 'sold', d.sold, 'left', greatest(0, d.stock - d.sold),
      'ends_at', d.ends_at,
      'mine', exists (select 1 from public.dress_inventory i where i.user_id = v_uid and i.family = d.family)) order by d.id)
    from public.mall_rare_drops d where d.day = v_day), '[]'::jsonb);
end $fn$;

create or replace function public.mall_buy_rare(p_drop bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); d public.mall_rare_drops; v_have integer; v_new integer;
begin
  select * into d from public.mall_rare_drops where id = p_drop for update;
  if d.id is null then return jsonb_build_object('error', 'Oferta não encontrada.'); end if;
  if now() < d.starts_at or now() >= d.ends_at then return jsonb_build_object('error', 'Essa oferta já terminou.'); end if;
  if exists (select 1 from public.dress_inventory where user_id = v_uid and family = d.family) then
    return jsonb_build_object('error', 'Você já tem essa peça.');
  end if;
  if d.sold >= d.stock then return jsonb_build_object('error', 'Esgotou! Todas as unidades já foram compradas.'); end if;
  select tickets into v_have from public.dress_stats where user_id = v_uid for update;
  if coalesce(v_have, 0) < d.price then
    return jsonb_build_object('error', 'Faltam ' || (d.price - coalesce(v_have, 0)) || ' bilhetes dourados.');
  end if;
  v_new := public.dress_apply_result(v_uid, -d.price, false);
  insert into public.dress_inventory (user_id, family, price) values (v_uid, d.family, d.price);
  insert into public.mall_rare_buys (drop_id, user_id) values (d.id, v_uid);
  update public.mall_rare_drops set sold = sold + 1 where id = d.id;
  return jsonb_build_object('ok', true, 'tickets', v_new, 'family', d.family, 'left', d.stock - d.sold - 1);
end $fn$;

-- ------------------------------------------------------------------ praça de alimentação
create or replace function public.mall_buy_food(p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); f public.mall_foods; v_have integer; v_new integer;
begin
  select * into f from public.mall_foods where key = p_key;
  if f.key is null then return jsonb_build_object('error', 'Esse item não existe.'); end if;
  select tickets into v_have from public.dress_stats where user_id = v_uid for update;
  if coalesce(v_have, 0) < f.price then
    return jsonb_build_object('error', 'Faltam ' || (f.price - coalesce(v_have, 0)) || ' bilhetes dourados.');
  end if;
  v_new := public.dress_apply_result(v_uid, -f.price, false);
  insert into public.mall_meals (user_id, food, price) values (v_uid, f.key, f.price);
  return jsonb_build_object('ok', true, 'tickets', v_new, 'food', f.key, 'seconds', f.seconds);
end $fn$;

-- ------------------------------------------------------------------ doação de bilhetes (cabine de bilhetes): até 30 por dia
create or replace function public.mall_gift_tickets(p_to uuid, p_amount integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_day_start timestamptz; v_sent integer; v_have integer; v_new integer; v_name text;
begin
  if p_amount is null or p_amount < 1 or p_amount > 30 then return jsonb_build_object('error', 'Escolha de 1 a 30 bilhetes.'); end if;
  if p_to is null or p_to = v_uid then return jsonb_build_object('error', 'Escolha outra jogadora.'); end if;
  select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Jogadora') into v_name
    from public.profiles where id = p_to and role in ('cria', 'leader', 'admin');
  if v_name is null then return jsonb_build_object('error', 'Essa jogadora não foi encontrada.'); end if;
  v_day_start := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  select coalesce(sum(amount), 0) into v_sent from public.mall_gifts where from_user = v_uid and created_at >= v_day_start;
  if v_sent + p_amount > 30 then
    return jsonb_build_object('error', case when v_sent >= 30 then 'Você já doou os 30 bilhetes de hoje. Volte amanhã!' else 'Hoje você ainda pode doar só ' || (30 - v_sent) || '.' end, 'sent_today', v_sent);
  end if;
  select tickets into v_have from public.dress_stats where user_id = v_uid for update;
  if coalesce(v_have, 0) < p_amount then return jsonb_build_object('error', 'Você não tem bilhetes suficientes.'); end if;
  update public.dress_stats set tickets = tickets - p_amount, updated_at = now() where user_id = v_uid returning tickets into v_new;
  insert into public.dress_stats (user_id, tickets, best) values (p_to, p_amount, 0)
  on conflict (user_id) do update set tickets = public.dress_stats.tickets + p_amount, updated_at = now();
  insert into public.mall_gifts (from_user, to_user, amount) values (v_uid, p_to, p_amount);
  return jsonb_build_object('ok', true, 'tickets', v_new, 'to', v_name, 'sent_today', v_sent + p_amount);
end $fn$;

create or replace function public.mall_gift_status()
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid(); v_day_start timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
begin
  return jsonb_build_object(
    'sent_today', (select coalesce(sum(amount), 0) from public.mall_gifts where from_user = v_uid and created_at >= v_day_start),
    'tickets', coalesce((select tickets from public.dress_stats where user_id = v_uid), 0),
    'unseen', coalesce((select jsonb_agg(jsonb_build_object('amount', g.amount, 'from', coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'Alguém')) order by g.created_at)
                          from public.mall_gifts g join public.profiles p on p.id = g.from_user where g.to_user = v_uid and not g.seen), '[]'::jsonb));
end $fn$;

create or replace function public.mall_gifts_seen()
returns void language plpgsql security definer set search_path to 'public' as $fn$
declare v_uid uuid := public._dress_uid();
begin
  update public.mall_gifts set seen = true where to_user = v_uid and not seen;
end $fn$;

revoke all on function public._mall_pool(), public._mall_ensure_today() from public, anon, authenticated;
revoke all on function public.mall_rare_offers(), public.mall_buy_rare(bigint), public.mall_buy_food(text), public.mall_gift_tickets(uuid, integer),
  public.mall_gift_status(), public.mall_gifts_seen() from public, anon;
grant execute on function public.mall_rare_offers(), public.mall_buy_rare(bigint), public.mall_buy_food(text), public.mall_gift_tickets(uuid, integer),
  public.mall_gift_status(), public.mall_gifts_seen() to authenticated;
