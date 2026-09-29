-- ELOS — engajamento do Explorar: ofensiva de postagem (selo por postar em
-- dias seguidos, mesmo padrão do devocional/status) e push de verdade quando
-- alguém reage/comenta numa foto (hoje só criava notificação in-app — quem
-- não estava com o app aberto naquele instante nunca ficava sabendo).

alter table public.profiles add column if not exists feed_streak int not null default 0;
alter table public.profiles add column if not exists feed_streak_date date;

-- guard_profile_update reverte progresso fora do xp_bypass — sem incluir as
-- duas colunas novas aqui, elas seriam desfeitas a cada gravação de perfil.
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
      new.feed_streak := old.feed_streak;
      new.feed_streak_date := old.feed_streak_date;
    end if;
  end if;
  return new;
end;
$fn$;

-- ---------------------------------------------------------------- ofensiva
create or replace function public.record_feed_streak()
returns int language plpgsql security definer set search_path = public as $fn$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_last date;
  v_streak int;
begin
  select feed_streak_date, feed_streak into v_last, v_streak from public.profiles where id = auth.uid();
  if v_last is not distinct from v_today then
    return coalesce(v_streak, 0);
  end if;
  if v_last = v_today - 1 then
    v_streak := coalesce(v_streak,0) + 1;
  else
    v_streak := 1;
  end if;

  perform set_config('elos.xp_bypass', 'on', true);
  update public.profiles set feed_streak = v_streak, feed_streak_date = v_today where id = auth.uid();
  perform set_config('elos.xp_bypass', 'off', true);

  perform public.check_and_grant_achievements(auth.uid());
  return v_streak;
end $fn$;
revoke execute on function public.record_feed_streak() from anon, public;
grant execute on function public.record_feed_streak() to authenticated;

-- ---------------------------------------------------------------- selos
insert into public.achievements (key, title, description, icon) values
  ('feed_3',  'Em Foco',      '3 dias seguidos postando no Explorar', '📸'),
  ('feed_7',  'Presença',     '7 dias seguidos postando no Explorar', '🌟'),
  ('feed_15', 'Constelação',  '15 dias seguidos postando no Explorar', '✨')
on conflict (key) do nothing;

create or replace function public.check_and_grant_achievements(p_user uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_streak int;
  v_devo_streak int;
  v_feed_streak int;
  v_approved int;
  v_posts int;
begin
  select status_streak, devotional_streak, feed_streak
    into v_streak, v_devo_streak, v_feed_streak
    from public.profiles where id = p_user;
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

  if coalesce(v_feed_streak,0) >= 3 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'feed_3') on conflict do nothing;
  end if;
  if coalesce(v_feed_streak,0) >= 7 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'feed_7') on conflict do nothing;
  end if;
  if coalesce(v_feed_streak,0) >= 15 then
    insert into public.user_achievements (user_id, achievement_key) values (p_user, 'feed_15') on conflict do nothing;
  end if;
end;
$fn$;

-- ---------------------------------------------------------------- push real em reação/comentário
-- Antes só criava a notificação in-app (sino) e retornava void — quem já
-- tinha saído do app não ficava sabendo que reagiram/comentaram na foto dele
-- até abrir o ELOS de novo por conta própria. Agora devolve o autor (uuid),
-- pra a Server Action mandar o push de verdade (mesmo padrão de
-- prayForRequest). O tipo de retorno mudou (void -> uuid), então precisa
-- dropar antes: CREATE OR REPLACE não troca o tipo de retorno de uma função.
drop function if exists public.notify_feed_interaction(uuid, text);

create or replace function public.notify_feed_interaction(p_post_id uuid, p_kind text)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_author uuid; v_actor_name text; v_title text; v_body text;
begin
  if p_kind not in ('like', 'comment') then
    raise exception 'Tipo de interação inválido';
  end if;

  select author_id into v_author from public.feed_posts where id = p_post_id;
  if v_author is null or v_author = auth.uid() then return null; end if;

  select full_name into v_actor_name from public.profiles where id = auth.uid();
  v_actor_name := coalesce(nullif(v_actor_name, ''), 'Alguém');

  if p_kind = 'like' then
    v_title := 'Curtiram sua foto';
    v_body  := v_actor_name || ' curtiu sua foto no feed.';
  else
    v_title := 'Comentaram na sua foto';
    v_body  := v_actor_name || ' comentou na sua foto no feed.';
  end if;

  insert into public.notifications (user_id, title, body, category)
  values (v_author, v_title, v_body, 'feed');

  return v_author;
end $fn$;

revoke execute on function public.notify_feed_interaction(uuid, text) from anon, public;
grant  execute on function public.notify_feed_interaction(uuid, text) to authenticated;
