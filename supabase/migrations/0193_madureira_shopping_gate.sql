-- Shopping Elos: as funções só valem para quem pode ver o jogo (admin, contas de teste, acesso antecipado ou visível para todos).
-- Assim ninguém compra ofertas raras chamando a API direto enquanto o shopping está oculto.
create or replace function public._mall_uid()
returns uuid language plpgsql stable security definer set search_path = public as $fn$
declare v uuid := public._dress_uid(); v_vis text;
begin
  select visibility into v_vis from public.game_settings where game = 'madureira';
  if coalesce(v_vis, 'auto') = 'visible' then return v; end if;
  if exists (select 1 from public.profiles where id = v and (role = 'admin' or is_test_account)) then return v; end if;
  if exists (select 1 from public.game_early_access where user_id = v and game = 'madureira') then return v; end if;
  raise exception 'O Shopping Elos ainda não abriu.';
end $fn$;
revoke all on function public._mall_uid() from public, anon, authenticated;

do $mig$
declare f text; d text;
begin
  foreach f in array array['mall_rare_offers()', 'mall_buy_rare(bigint)', 'mall_buy_food(text)', 'mall_gift_tickets(uuid,integer)', 'mall_gift_status()', 'mall_gifts_seen()'] loop
    d := pg_get_functiondef(('public.' || f)::regprocedure);
    if position('public._dress_uid()' in d) = 0 then raise exception 'sem _dress_uid em %', f; end if;
    d := replace(d, 'public._dress_uid()', 'public._mall_uid()');
    execute d;
  end loop;
end $mig$;
