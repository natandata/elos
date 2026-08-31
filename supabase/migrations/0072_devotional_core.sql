-- Meu Devocional (Fase 1 — núcleo pessoal): diário, mural de oração,
-- versículos favoritos e ofensiva (streak) dedicada ao devocional.

alter table public.profiles add column if not exists devotional_streak int not null default 0;
alter table public.profiles add column if not exists devotional_streak_date date;

-- guard_profile_update reverte qualquer coluna de progresso que não passe
-- pelo xp_bypass (já é o padrão usado por xp/status_streak) — sem isso as
-- duas colunas novas seriam silenciosamente desfeitas a cada gravação.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role     := old.role;
    new.elo_id   := old.elo_id;
    new.approved := old.approved;
    if coalesce(current_setting('elos.xp_bypass', true), 'off') <> 'on' then
      new.xp := old.xp;
      new.status_streak := old.status_streak;
      new.status_streak_date := old.status_streak_date;
      new.last_login_bonus_on := old.last_login_bonus_on;
      new.devotional_streak := old.devotional_streak;
      new.devotional_streak_date := old.devotional_streak_date;
    end if;
  end if;
  return new;
end;
$fn$;

-- ---------------------------------------------------------------- diário
create table if not exists public.devotional_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);
create index if not exists devotional_entries_user_idx on public.devotional_entries(user_id, entry_date desc);
alter table public.devotional_entries enable row level security;

drop policy if exists devotional_entries_owner on public.devotional_entries;
create policy devotional_entries_owner on public.devotional_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- oração
create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  elo_id uuid references public.elos(id) on delete set null,
  scope text not null default 'personal' check (scope in ('personal','elo')),
  title text not null,
  is_answered boolean not null default false,
  answered_at timestamptz,
  reminder_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prayer_requests_user_idx on public.prayer_requests(user_id);
create index if not exists prayer_requests_elo_idx on public.prayer_requests(elo_id) where scope = 'elo';
alter table public.prayer_requests enable row level security;

drop policy if exists prayer_requests_read on public.prayer_requests;
create policy prayer_requests_read on public.prayer_requests for select to authenticated using (
  user_id = auth.uid()
  or (scope = 'elo' and elo_id is not null and elo_id = (select elo_id from public.profiles where id = auth.uid()))
  or public.is_admin()
);
drop policy if exists prayer_requests_insert on public.prayer_requests;
create policy prayer_requests_insert on public.prayer_requests for insert to authenticated with check (
  user_id = auth.uid()
  and (scope = 'personal' or (scope = 'elo' and elo_id = (select elo_id from public.profiles where id = auth.uid())))
);
drop policy if exists prayer_requests_update on public.prayer_requests;
create policy prayer_requests_update on public.prayer_requests for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists prayer_requests_delete on public.prayer_requests;
create policy prayer_requests_delete on public.prayer_requests for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------- favoritos
create table if not exists public.devotional_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reference text not null,
  verse_text text not null,
  created_at timestamptz not null default now()
);
create index if not exists devotional_favorites_user_idx on public.devotional_favorites(user_id, created_at desc);
alter table public.devotional_favorites enable row level security;

drop policy if exists devotional_favorites_owner on public.devotional_favorites;
create policy devotional_favorites_owner on public.devotional_favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- streak
create or replace function public.record_devotional_streak()
returns int language plpgsql security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_last date;
  v_streak int;
begin
  select devotional_streak_date, devotional_streak into v_last, v_streak from public.profiles where id = auth.uid();
  if v_last is not distinct from v_today then
    return coalesce(v_streak, 0);
  end if;
  if v_last = v_today - 1 then
    v_streak := coalesce(v_streak,0) + 1;
  else
    v_streak := 1;
  end if;

  perform set_config('elos.xp_bypass', 'on', true);
  update public.profiles set devotional_streak = v_streak, devotional_streak_date = v_today where id = auth.uid();
  perform set_config('elos.xp_bypass', 'off', true);

  perform public.check_and_grant_achievements(auth.uid());
  return v_streak;
end $fn$;
revoke execute on function public.record_devotional_streak() from anon, public;
grant execute on function public.record_devotional_streak() to authenticated;

-- ---------------------------------------------------------------- selos
insert into public.achievements (key, title, description, icon) values
  ('devotional_7',  'Constância',      '7 dias seguidos de devocional', '📖'),
  ('devotional_15', 'Firmeza',         '15 dias seguidos de devocional', '🕊️'),
  ('devotional_30', 'Raiz Profunda',   '30 dias seguidos de devocional', '🌳'),
  ('devotional_90', 'Perseverança',    '90 dias seguidos de devocional', '⭐')
on conflict (key) do nothing;

create or replace function public.check_and_grant_achievements(p_user uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_streak int;
  v_devo_streak int;
  v_approved int;
  v_posts int;
begin
  select status_streak, devotional_streak into v_streak, v_devo_streak from public.profiles where id = p_user;
  select count(*) into v_approved from public.mission_assignments where cria_id = p_user and status = 'approved';
  select count(*) into v_posts from public.feed_posts where author_id = p_user;

  if coalesce(v_streak,0) >= 7 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'streak_7') on conflict do nothing;
  end if;
  if coalesce(v_streak,0) >= 30 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'streak_30') on conflict do nothing;
  end if;
  if coalesce(v_posts,0) >= 1 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'first_feed_post') on conflict do nothing;
  end if;
  if coalesce(v_approved,0) >= 10 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'missions_10') on conflict do nothing;
  end if;
  if coalesce(v_approved,0) >= 30 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'missions_30') on conflict do nothing;
  end if;

  if coalesce(v_devo_streak,0) >= 7 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'devotional_7') on conflict do nothing;
  end if;
  if coalesce(v_devo_streak,0) >= 15 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'devotional_15') on conflict do nothing;
  end if;
  if coalesce(v_devo_streak,0) >= 30 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'devotional_30') on conflict do nothing;
  end if;
  if coalesce(v_devo_streak,0) >= 90 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'devotional_90') on conflict do nothing;
  end if;
end;
$fn$;
