-- ELOS — o admin confundia "XP bônus" (um valor à parte, que soma por cima
-- do XP dos crias) com o XP TOTAL do Elo: digitava o total que queria e a
-- tela salvava aquilo como bônus, dobrando a conta. As duas funções abaixo
-- deixam claro o que cada ação faz: uma DEFINE o total (calculando o bônus
-- necessário por trás), a outra só SOMA um bônus por cima do que já existe —
-- e ambas calculam a soma dos crias no próprio banco, sem depender de um
-- valor que o front trouxe (evita ficar desatualizado entre o carregamento
-- da tela e o clique em salvar).

create or replace function public.admin_set_elo_total_xp(p_elo_id uuid, p_total integer)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_crias_xp integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin';
  end if;

  select coalesce(sum(xp), 0) into v_crias_xp
    from public.profiles
   where elo_id = p_elo_id and role = 'cria';

  update public.elos set bonus_xp = p_total - v_crias_xp where id = p_elo_id;
end $fn$;

revoke execute on function public.admin_set_elo_total_xp(uuid, integer) from anon, public;
grant  execute on function public.admin_set_elo_total_xp(uuid, integer) to authenticated;

create or replace function public.admin_add_elo_bonus_xp(p_elo_id uuid, p_amount integer)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin';
  end if;

  update public.elos set bonus_xp = bonus_xp + p_amount where id = p_elo_id;
end $fn$;

revoke execute on function public.admin_add_elo_bonus_xp(uuid, integer) from anon, public;
grant  execute on function public.admin_add_elo_bonus_xp(uuid, integer) to authenticated;
