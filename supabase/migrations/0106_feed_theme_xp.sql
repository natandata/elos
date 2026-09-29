-- ELOS — postar no Explorar CUMPRINDO o tema do dia rende 1 XP pro cria ou
-- líder, mediante confirmação própria na hora de postar ("Esse post é pra
-- cumprir o tema do dia?"). Admin pode revogar depois se o post não for
-- coerente com o tema.

alter table public.feed_posts
  add column if not exists theme_confirmed boolean not null default false,
  add column if not exists theme_xp_awarded boolean not null default false,
  add column if not exists theme_xp_revoked boolean not null default false,
  add column if not exists theme_xp_revoked_by uuid references public.profiles(id) on delete set null,
  add column if not exists theme_xp_revoked_at timestamptz;

alter table public.xp_transactions
  add column if not exists feed_post_id uuid references public.feed_posts(id) on delete set null;

-- feed_posts_update (0037) só trava DONO da linha, não QUAIS colunas —
-- sem isso, qualquer autor poderia fazer um update direto (fora da Server
-- Action) forjando theme_xp_awarded=true na própria foto. Mesmo padrão de
-- guard_profile_update: as colunas de XP do tema só mudam com o bypass
-- ligado (dentro das funções abaixo), nunca por um update comum do dono.
create or replace function public.guard_feed_post_update()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if coalesce(current_setting('elos.xp_bypass', true), 'off') <> 'on' then
    new.theme_xp_awarded := old.theme_xp_awarded;
    new.theme_xp_revoked := old.theme_xp_revoked;
    new.theme_xp_revoked_by := old.theme_xp_revoked_by;
    new.theme_xp_revoked_at := old.theme_xp_revoked_at;
  end if;
  return new;
end;
$fn$;

drop trigger if exists guard_feed_post_update_trg on public.feed_posts;
create trigger guard_feed_post_update_trg
  before update on public.feed_posts
  for each row execute function public.guard_feed_post_update();

-- ---------------------------------------------------------------- concessão
create or replace function public.award_feed_theme_xp(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_author uuid; v_confirmed boolean; v_awarded boolean;
begin
  select author_id, theme_confirmed, theme_xp_awarded
    into v_author, v_confirmed, v_awarded
    from public.feed_posts where id = p_post_id;

  if v_author is null or v_author <> auth.uid() then
    raise exception 'Sem permissão';
  end if;
  -- idempotente: se não confirmou o tema ou já foi premiado, não faz nada
  -- (evita XP duplicado se a action for chamada de novo por qualquer motivo).
  if not coalesce(v_confirmed, false) or coalesce(v_awarded, false) then
    return;
  end if;

  perform set_config('elos.xp_bypass', 'on', true);
  update public.profiles set xp = xp + 1 where id = v_author;
  update public.feed_posts set theme_xp_awarded = true where id = p_post_id;
  perform set_config('elos.xp_bypass', 'off', true);

  insert into public.xp_transactions (user_id, feed_post_id, amount, type)
  values (v_author, p_post_id, 1, 'feed_theme');
end $fn$;

revoke execute on function public.award_feed_theme_xp(uuid) from anon, public;
grant execute on function public.award_feed_theme_xp(uuid) to authenticated;

-- ---------------------------------------------------------------- revogação (admin)
create or replace function public.revoke_feed_theme_xp(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_author uuid; v_awarded boolean; v_revoked boolean;
begin
  if not public.is_admin() then
    raise exception 'Sem permissão';
  end if;

  select author_id, theme_xp_awarded, theme_xp_revoked
    into v_author, v_awarded, v_revoked
    from public.feed_posts where id = p_post_id;
  if v_author is null then raise exception 'Post não encontrado'; end if;
  if not coalesce(v_awarded, false) or coalesce(v_revoked, false) then
    return;
  end if;

  perform set_config('elos.xp_bypass', 'on', true);
  update public.profiles set xp = greatest(0, xp - 1) where id = v_author;
  update public.feed_posts
     set theme_xp_revoked = true, theme_xp_revoked_by = auth.uid(), theme_xp_revoked_at = now()
   where id = p_post_id;
  perform set_config('elos.xp_bypass', 'off', true);

  insert into public.xp_transactions (user_id, feed_post_id, amount, type)
  values (v_author, p_post_id, -1, 'feed_theme_revoked');

  insert into public.notifications (user_id, title, body, category)
  values (
    v_author,
    'XP do tema revogado',
    'O admin revogou o XP do tema do dia numa das suas fotos no Explorar — o post não pareceu coerente com o tema.',
    'feed'
  );
end $fn$;

revoke execute on function public.revoke_feed_theme_xp(uuid) from anon, public;
grant execute on function public.revoke_feed_theme_xp(uuid) to authenticated;
