-- Clash of Tribos: operações atômicas de saldo (só o servidor chama).

create or replace function public.tribos_add(p_user uuid, p_gold bigint, p_mana bigint, p_gems int, p_xp int)
returns void language sql security definer set search_path = public as $$
  update public.tribos_player
     set gold = gold + p_gold, mana = mana + p_mana, gems = gems + p_gems, xp = xp + p_xp, updated_at = now()
   where user_id = p_user;
$$;

-- Gasta se houver saldo para tudo; devolve false (sem gastar nada) se faltar.
create or replace function public.tribos_spend(p_user uuid, p_gold bigint, p_mana bigint, p_gems int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.tribos_player
     set gold = gold - p_gold, mana = mana - p_mana, gems = gems - p_gems, updated_at = now()
   where user_id = p_user and gold >= p_gold and mana >= p_mana and gems >= p_gems;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- Coleta: soma ao ouro ou maná sem passar da capacidade; devolve quanto entrou de verdade.
create or replace function public.tribos_collect(p_user uuid, p_res text, p_amount bigint, p_cap bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare cur bigint; take bigint;
begin
  if p_res not in ('gold', 'mana') then raise exception 'recurso inválido'; end if;
  select case when p_res = 'gold' then gold else mana end into cur from public.tribos_player where user_id = p_user for update;
  if cur is null then return 0; end if;
  take := greatest(0, least(p_amount, p_cap - cur));
  if take > 0 then
    if p_res = 'gold' then update public.tribos_player set gold = gold + take, updated_at = now() where user_id = p_user;
    else update public.tribos_player set mana = mana + take, updated_at = now() where user_id = p_user; end if;
  end if;
  return take;
end $$;

revoke execute on function public.tribos_add(uuid, bigint, bigint, int, int) from public, anon, authenticated;
revoke execute on function public.tribos_spend(uuid, bigint, bigint, int) from public, anon, authenticated;
revoke execute on function public.tribos_collect(uuid, text, bigint, bigint) from public, anon, authenticated;
grant execute on function public.tribos_add(uuid, bigint, bigint, int, int) to service_role;
grant execute on function public.tribos_spend(uuid, bigint, bigint, int) to service_role;
grant execute on function public.tribos_collect(uuid, text, bigint, bigint) to service_role;
