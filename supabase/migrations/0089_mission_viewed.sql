-- Admin e líderes querem ver quem já abriu/leu a missão, não só quem já
-- enviou/aprovou. viewed_at é marcado na primeira vez que o próprio cria (ou
-- líder, no caso de missão da Liderança) carrega a página de missões dele.
alter table public.mission_assignments
  add column if not exists viewed_at timestamptz;

-- Sem policy de update pra cria em mission_assignments (só via RPC, mesmo
-- padrão de submit_mission/review_assignment) — então marcar como visto
-- também passa por função SECURITY DEFINER, restrita a quem é o próprio
-- dono da atribuição.
create or replace function public.mark_missions_viewed(p_assignment_ids uuid[])
returns void language plpgsql security definer set search_path = public as $fn$
begin
  update public.mission_assignments
     set viewed_at = now()
   where id = any(p_assignment_ids)
     and cria_id = auth.uid()
     and viewed_at is null;
end $fn$;

revoke execute on function public.mark_missions_viewed(uuid[]) from anon, public;
grant  execute on function public.mark_missions_viewed(uuid[]) to authenticated;
