-- Shopping Elos: além de admin, conta de teste, acesso antecipado e "visível", as funções abrem na data de lançamento que o admin escolher (game_settings.open_at).
create or replace function public._mall_uid()
returns uuid language plpgsql stable security definer set search_path = public as $fn$
declare v uuid := public._dress_uid(); v_vis text; v_open timestamptz;
begin
  select visibility, open_at into v_vis, v_open from public.game_settings where game = 'madureira';
  if coalesce(v_vis, 'auto') = 'visible' then return v; end if;
  if coalesce(v_vis, 'auto') <> 'hidden' and v_open is not null and now() >= v_open then return v; end if;
  if exists (select 1 from public.profiles where id = v and (role = 'admin' or is_test_account)) then return v; end if;
  if exists (select 1 from public.game_early_access where user_id = v and game = 'madureira') then return v; end if;
  raise exception 'O Shopping Elos ainda não abriu.';
end $fn$;
revoke all on function public._mall_uid() from public, anon, authenticated;
