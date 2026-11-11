-- Acampadentro: o admin define a resposta de presença (vai / talvez / não vai / sem resposta) de qualquer pessoa.
-- A tabela acampadentro_rsvp tem user_id (PK), status (yes/no/maybe), updated_at e answered_at.
create or replace function public.acampadentro_admin_set_rsvp(p_user uuid, p_status text) returns boolean
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then return false; end if;
  if p_user is null or not exists (select 1 from profiles where id = p_user) then return false; end if;
  if p_status is null or p_status = 'none' then
    delete from acampadentro_rsvp where user_id = p_user;
    return true;
  end if;
  if p_status not in ('yes', 'no', 'maybe') then return false; end if;
  insert into acampadentro_rsvp (user_id, status, updated_at, answered_at) values (p_user, p_status, now(), now())
  on conflict (user_id) do update set status = excluded.status, updated_at = now();
  return true;
end $$;

grant execute on function public.acampadentro_admin_set_rsvp(uuid, text) to authenticated;
